<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A payment the club makes to a competition's organizer. Cash and bank
 * payments are posted to the Ledger as expenses (two-way sync, like
 * CompetitionPayment); "other" payments and ones not paid from the club's
 * accounts (post_to_ledger = false) are not posted.
 */
class CompetitionOrganizerPayment extends Model
{
    public const METHODS = ['cash', 'bank_transfer', 'other'];

    protected $fillable = [
        'competition_id', 'amount', 'currency', 'currency_amount', 'paid_at', 'payment_method', 'description',
        'note', 'post_to_ledger', 'ledger_category_id', 'ledger_entry_id', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'currency_amount' => 'decimal:2',
        'paid_at' => 'date:Y-m-d',
        'post_to_ledger' => 'boolean',
    ];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function ledgerEntry()
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }

    protected static function booted()
    {
        static::saved(function (CompetitionOrganizerPayment $payment) {
            $payment->syncLedgerEntry();
        });
        static::deleted(function (CompetitionOrganizerPayment $payment) {
            $payment->removeLedgerEntry();
        });
    }

    /**
     * Cash-book bucket by method and the competition's currency.
     */
    public function ledgerBucket()
    {
        $currency = $this->paymentCurrency();
        if ($this->payment_method === 'cash') {
            return $currency === 'RSD' ? 'cash' : 'cash_eur';
        }
        if ($this->payment_method === 'bank_transfer') {
            return $currency === 'RSD' ? 'bank' : 'eur';
        }
        return null;
    }

    /**
     * Currency actually paid in (defaults to the competition's currency).
     */
    public function paymentCurrency()
    {
        return $this->currency ?: ($this->competition->currency ?? 'EUR');
    }

    /**
     * True when paid in a currency other than the competition's.
     */
    public function isForeignCurrency()
    {
        return $this->currency && $this->currency !== ($this->competition->currency ?? 'EUR') && $this->currency_amount !== null;
    }

    /**
     * Amount for the Ledger: what was actually paid, in the payment's currency.
     */
    public function ledgerAmount()
    {
        return $this->isForeignCurrency() ? $this->currency_amount : $this->amount;
    }

    /**
     * Ledger → payment sync: a changed Ledger amount is what was actually paid.
     */
    public function ledgerAmountAttributes($amount)
    {
        return $this->isForeignCurrency() ? ['currency_amount' => $amount] : ['amount' => $amount];
    }

    public function syncLedgerEntry()
    {
        $bucket = $this->post_to_ledger === false ? null : $this->ledgerBucket();
        if (!$bucket || (float) $this->ledgerAmount() <= 0 || !$this->paid_at) {
            $this->removeLedgerEntry();
            return;
        }

        $payload = [
            'entry_date' => $this->paid_at,
            'type' => 'expense',
            'bucket' => $bucket,
            'amount' => $this->ledgerAmount(),
            'description' => trim('Organizer: ' . ($this->competition->name ?? '') . ($this->description ? ' — ' . $this->description : '')),
            'ledger_category_id' => $this->ledger_category_id,
            'member_id' => null,
            'notes' => $this->note,
            'source' => 'manual',
            'updated_by' => auth()->id() ?? $this->created_by,
        ];

        if ($this->ledger_entry_id) {
            $entry = LedgerEntry::withTrashed()->find($this->ledger_entry_id);
            if ($entry) {
                if ($entry->trashed()) {
                    $entry->restore();
                }
                $entry->fill($payload)->save();
                return;
            }
        }

        $entry = LedgerEntry::create(array_merge($payload, [
            'created_by' => auth()->id() ?? $this->created_by,
        ]));
        // Persist the link without re-firing saved().
        $this->ledger_entry_id = $entry->id;
        $this->saveQuietly();
    }

    public function removeLedgerEntry()
    {
        if (!$this->ledger_entry_id) {
            return;
        }
        // Clear the link first so the entry's deleting hook doesn't delete this payment too.
        $entryId = $this->ledger_entry_id;
        $this->ledger_entry_id = null;
        if ($this->exists) {
            $this->saveQuietly();
        }
        LedgerEntry::where('id', $entryId)->forceDelete();
    }
}
