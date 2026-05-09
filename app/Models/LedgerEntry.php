<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LedgerEntry extends Model
{
    use HasFactory, SoftDeletes;

    public const BUCKETS = ['cash', 'bank', 'eur'];
    public const TYPES = ['income', 'expense'];

    protected $fillable = [
        'entry_date',
        'type',
        'bucket',
        'amount',
        'description',
        'ledger_category_id',
        'member_id',
        'notes',
        'source',
        'source_hash',
        'import_batch_id',
        'sort_order',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'entry_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(LedgerCategory::class, 'ledger_category_id');
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function membershipPayment()
    {
        return $this->hasOne(MembershipPayment::class, 'ledger_entry_id');
    }

    protected static function booted()
    {
        static::saved(function (LedgerEntry $entry) {
            $entry->syncToLinkedPayment();
        });
        static::deleting(function (LedgerEntry $entry) {
            $entry->deleteLinkedPayment();
        });
    }

    /**
     * Reverse leg of the Payment ↔ Ledger sync. When a payment-linked
     * ledger entry is updated, write back the relevant fields to the
     * payment (amount, date, payment_method derived from the bucket).
     * Skipped when no linked payment exists or no relevant field changed.
     */
    public function syncToLinkedPayment(): void
    {
        if (!$this->wasChanged(['amount', 'entry_date', 'bucket'])) return;

        $payment = MembershipPayment::where('ledger_entry_id', $this->id)->first();
        if (!$payment) return;

        $method = match ($this->bucket) {
            'cash' => 'cash',
            'bank' => in_array($payment->payment_method, ['card', 'bank_transfer'], true)
                ? $payment->payment_method
                : 'bank_transfer',
            'eur' => $payment->payment_method, // no EUR method on payments; keep as-is
            default => $payment->payment_method,
        };

        $payment->fill([
            'paid_amount' => $this->amount,
            'payment_date' => $this->entry_date instanceof \DateTimeInterface
                ? $this->entry_date->format('Y-m-d')
                : $this->entry_date,
            'payment_method' => $method,
        ]);
        $payment->saveQuietly();
    }

    /**
     * If a ledger entry has a linked payment, deleting the entry should
     * also delete the payment (per user's 2-way model). Break the link
     * BEFORE deleting the payment so the payment's own deleted-hook
     * won't try to re-delete this entry while it's already deleting.
     */
    public function deleteLinkedPayment(): void
    {
        $payment = MembershipPayment::where('ledger_entry_id', $this->id)->first();
        if (!$payment) return;

        $payment->ledger_entry_id = null;
        $payment->saveQuietly();
        $payment->delete();
    }

    public function importBatch()
    {
        return $this->belongsTo(LedgerImportBatch::class, 'import_batch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function scopeForMonth($query, int $year, int $month)
    {
        $start = sprintf('%04d-%02d-01', $year, $month);
        $end = date('Y-m-t', strtotime($start));
        return $query->whereBetween('entry_date', [$start, $end]);
    }

    public function scopeForYear($query, int $year)
    {
        return $query->whereBetween('entry_date', ["{$year}-01-01", "{$year}-12-31"]);
    }

    /**
     * Compute running balance for a bucket up to (and including) a given date.
     * Excludes soft-deleted entries. Adds the seeded opening balance for the
     * earliest year present (if any) plus signed entries since.
     */
    public static function runningBalance(string $bucket, string $upToDate, ?int $seedYear = null): float
    {
        $income = static::query()
            ->where('bucket', $bucket)
            ->where('type', 'income')
            ->where('entry_date', '<=', $upToDate)
            ->sum('amount');

        $expense = static::query()
            ->where('bucket', $bucket)
            ->where('type', 'expense')
            ->where('entry_date', '<=', $upToDate)
            ->sum('amount');

        $opening = 0.0;
        if ($seedYear !== null) {
            $opening = (float) PaymentSetting::get(self::openingBalanceKey($bucket, $seedYear), 0);
        }

        return (float) $opening + (float) $income - (float) $expense;
    }

    public static function openingBalanceKey(string $bucket, int $year): string
    {
        return "ledger_opening_balance_{$bucket}_{$year}";
    }

    public static function buildSourceHash(array $parts): string
    {
        // Include tab_gid + sort_order so two GENUINELY identical rows
        // (e.g. one member paying two months at once) become distinct
        // entries instead of the second being skipped as a duplicate.
        // Re-importing the same file produces identical sort_orders,
        // so idempotency still holds.
        $payload = sprintf(
            '%s|%s|%s|%s|%s|%.2f|%s',
            $parts['tab_gid'] ?? '',
            (string) ($parts['sort_order'] ?? 0),
            $parts['entry_date'],
            $parts['bucket'],
            $parts['type'],
            (float) $parts['amount'],
            LedgerCategory::normalize((string) $parts['description'])
        );
        return hash('sha256', $payload);
    }
}
