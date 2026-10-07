<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompetitionPayment extends Model
{
    public const METHODS = ['cash', 'bank_transfer', 'other'];

    protected $fillable = [
        'competition_participant_id', 'amount', 'paid_at', 'payment_method',
        'note', 'ledger_entry_id', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date:Y-m-d',
    ];

    public function participant()
    {
        return $this->belongsTo(CompetitionParticipant::class, 'competition_participant_id');
    }

    public function ledgerEntry()
    {
        return $this->belongsTo(LedgerEntry::class, 'ledger_entry_id');
    }

    protected static function booted()
    {
        static::saved(function (CompetitionPayment $payment) {
            $payment->syncLedgerEntry();
        });
        static::deleted(function (CompetitionPayment $payment) {
            $payment->removeLedgerEntry();
        });
    }

    /**
     * Cash-book bucket for this payment: by method and the competition's
     * currency. 'other' payments are not posted to the ledger.
     */
    public function ledgerBucket()
    {
        $currency = $this->participant->competition->currency ?? 'EUR';

        if ($this->payment_method === 'cash') {
            return $currency === 'RSD' ? 'cash' : 'cash_eur';
        }
        if ($this->payment_method === 'bank_transfer') {
            return $currency === 'RSD' ? 'bank' : 'eur';
        }

        return null;
    }

    /**
     * Create or update the linked LedgerEntry (mirrors MembershipPayment).
     * Removes the entry when the payment no longer qualifies.
     */
    public function syncLedgerEntry()
    {
        $bucket = $this->ledgerBucket();
        if (!$bucket || (float) $this->amount <= 0 || !$this->paid_at) {
            $this->removeLedgerEntry();
            return;
        }

        $participant = $this->participant;
        $payload = [
            'entry_date' => $this->paid_at,
            'type' => 'income',
            'bucket' => $bucket,
            'amount' => $this->amount,
            'description' => 'Competition: ' . ($participant->competition->name ?? ''),
            'ledger_category_id' => self::ledgerCategoryId(),
            'member_id' => $participant->member_id,
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

        // Clear the link before deleting the entry so the entry's deleting
        // hook doesn't find and delete this payment too.
        $entryId = $this->ledger_entry_id;
        $this->ledger_entry_id = null;
        if ($this->exists) {
            $this->saveQuietly();
        }
        LedgerEntry::where('id', $entryId)->forceDelete();
    }

    private static function ledgerCategoryId()
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        $cat = LedgerCategory::firstOrCreate(
            ['normalized_name' => LedgerCategory::normalize('kotizacije')],
            ['name' => 'kotizacije', 'kind' => 'income', 'is_active' => true, 'sort_order' => 0]
        );

        return $cached = $cat->id;
    }
}
