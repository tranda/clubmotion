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
        $payload = sprintf(
            '%s|%s|%s|%.2f|%s',
            $parts['entry_date'],
            $parts['bucket'],
            $parts['type'],
            (float) $parts['amount'],
            LedgerCategory::normalize((string) $parts['description'])
        );
        return hash('sha256', $payload);
    }
}
