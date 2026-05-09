<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'payment_year',
        'payment_month',
        'expected_amount',
        'paid_amount',
        'payment_status',
        'is_annual_payment',
        'annual_payment_group_id',
        'exemption_reason',
        'payment_date',
        'payment_method',
        'notes',
        'created_by',
        'ledger_entry_id',
    ];

    protected $casts = [
        'payment_date' => 'date:Y-m-d',
        'expected_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'payment_year' => 'integer',
        'payment_month' => 'integer',
        'is_annual_payment' => 'boolean',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOverdue()
    {
        return $this->payment_status === 'overdue';
    }

    public function isPaid()
    {
        return $this->payment_status === 'paid';
    }

    public function isExempt()
    {
        return $this->payment_status === 'exempt';
    }

    public function markAsPaid($amount, $method, $date = null)
    {
        $this->update([
            'paid_amount' => $amount,
            'payment_status' => 'paid',
            'payment_method' => $method,
            'payment_date' => $date ?? now(),
        ]);
    }

    public function getMonthNameAttribute()
    {
        $months = [
            1 => 'JAN', 2 => 'FEB', 3 => 'MAR', 4 => 'APR',
            5 => 'MAY', 6 => 'JUN', 7 => 'JUL', 8 => 'AUG',
            9 => 'SEP', 10 => 'OCT', 11 => 'NOV', 12 => 'DEC'
        ];
        return $months[$this->payment_month] ?? '';
    }

    public function isAnnualPayment()
    {
        return $this->is_annual_payment;
    }

    public function scopeAnnualGroup($query, $groupId)
    {
        return $query->where('annual_payment_group_id', $groupId);
    }

    public function ledgerEntry()
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }

    protected static function booted()
    {
        static::saved(function (MembershipPayment $payment) {
            $payment->syncLedgerEntry();
        });
        static::deleted(function (MembershipPayment $payment) {
            $payment->removeLedgerEntry();
        });
    }

    /**
     * Returns the bucket the payment_method maps to, or null when no bucket
     * applies (e.g. payment_method not set yet).
     */
    public function ledgerBucket(): ?string
    {
        return match ($this->payment_method) {
            'cash' => 'cash',
            'card', 'bank_transfer' => 'bank',
            default => null,
        };
    }

    /**
     * A payment qualifies for a ledger entry only when it represents an
     * actual paid sum: status=paid, amount>0, date set, and a method that
     * maps to a bucket.
     */
    public function qualifiesForLedger(): bool
    {
        return $this->payment_status === 'paid'
            && (float) $this->paid_amount > 0
            && $this->payment_date !== null
            && $this->ledgerBucket() !== null;
    }

    /**
     * Create or update the linked LedgerEntry to reflect the current state
     * of this payment. If the payment no longer qualifies (e.g. status was
     * cleared, method removed), the linked entry is deleted.
     */
    public function syncLedgerEntry(): void
    {
        if (!$this->qualifiesForLedger()) {
            $this->removeLedgerEntry();
            return;
        }

        $bucket = $this->ledgerBucket();
        $catId = self::membershipCategoryId();

        $monthNames = [
            1 => 'JAN', 2 => 'FEB', 3 => 'MAR', 4 => 'APR',
            5 => 'MAY', 6 => 'JUN', 7 => 'JUL', 8 => 'AUG',
            9 => 'SEP', 10 => 'OCT', 11 => 'NOV', 12 => 'DEC',
        ];
        $monthLabel = $monthNames[$this->payment_month] ?? '';
        $description = trim("Membership {$monthLabel}");

        $payload = [
            'entry_date' => $this->payment_date,
            'type' => 'income',
            'bucket' => $bucket,
            'amount' => $this->paid_amount,
            'description' => $description,
            'ledger_category_id' => $catId,
            'member_id' => $this->member_id,
            'source' => 'manual',
            'updated_by' => auth()->id() ?? $this->created_by,
        ];

        if ($this->ledger_entry_id) {
            $entry = LedgerEntry::withTrashed()->find($this->ledger_entry_id);
            if ($entry) {
                if ($entry->trashed()) $entry->restore();
                $entry->fill($payload)->save();
                return;
            }
        }

        $entry = LedgerEntry::create(array_merge($payload, [
            'created_by' => auth()->id() ?? $this->created_by,
        ]));

        // Persist the link without re-firing saved() (no infinite loop).
        $this->ledger_entry_id = $entry->id;
        $this->saveQuietly();
    }

    public function removeLedgerEntry(): void
    {
        if ($this->ledger_entry_id) {
            LedgerEntry::where('id', $this->ledger_entry_id)->forceDelete();
            $this->ledger_entry_id = null;
            $this->saveQuietly();
        }
    }

    private static function membershipCategoryId(): int
    {
        static $cached = null;
        if ($cached !== null) return $cached;

        $normalized = LedgerCategory::normalize('Membership');
        $cat = LedgerCategory::firstOrCreate(
            ['normalized_name' => $normalized],
            ['name' => 'Membership', 'kind' => 'income', 'is_active' => true, 'sort_order' => 0]
        );
        return $cached = $cat->id;
    }
}