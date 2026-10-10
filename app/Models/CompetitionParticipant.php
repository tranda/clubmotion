<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompetitionParticipant extends Model
{
    public const STATUSES = ['active', 'cancelled', 'exempt'];

    public const ROLES = ['athlete', 'supporter'];

    protected $fillable = [
        'competition_id', 'member_id', 'role', 'fee_amount', 'status',
        'extra_athletes', 'extra_supporters', 'extra_children', 'notes',
    ];

    protected $casts = [
        'fee_amount' => 'decimal:2',
        'extra_athletes' => 'integer',
        'extra_supporters' => 'integer',
        'extra_children' => 'integer',
    ];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function payments()
    {
        return $this->hasMany(CompetitionPayment::class)->orderByDesc('paid_at')->orderByDesc('id');
    }

    /**
     * Load payment aggregates in one query: paid_amount and last_payment_at
     * then read from these instead of the full payment list.
     */
    public function scopeWithPaymentTotals($query)
    {
        return $query->withSum('payments as payments_sum', 'amount')
            ->withMax('payments as payments_last', 'paid_at');
    }

    public function getPaidAmountAttribute()
    {
        $sum = array_key_exists('payments_sum', $this->attributes)
            ? $this->attributes['payments_sum']
            : $this->payments()->sum('amount');

        return round((float) $sum, 2);
    }

    public function getRemainingAmountAttribute()
    {
        if ($this->status !== 'active') {
            return 0.0;
        }

        return round(max((float) $this->fee_amount - $this->paid_amount, 0), 2);
    }

    public function getOverpaidAmountAttribute()
    {
        if ($this->status !== 'active') {
            return 0.0;
        }

        return round(max($this->paid_amount - (float) $this->fee_amount, 0), 2);
    }

    public function getLastPaymentAtAttribute()
    {
        $last = array_key_exists('payments_last', $this->attributes)
            ? $this->attributes['payments_last']
            : $this->payments()->max('paid_at');

        return $last ? substr($last, 0, 10) : null;
    }

    /**
     * Calculated, never stored: exempt, cancelled, unpaid, partial, paid, overpaid.
     */
    public function getPaymentStatusAttribute()
    {
        if ($this->status === 'exempt' || $this->status === 'cancelled') {
            return $this->status;
        }

        $paid = $this->paid_amount;
        $fee = (float) $this->fee_amount;

        if ($paid <= 0) {
            return $fee > 0 ? 'unpaid' : 'paid';
        }
        if ($paid < $fee) {
            return 'partial';
        }

        return $paid > $fee ? 'overpaid' : 'paid';
    }

    /**
     * Shape sent to the frontend, with all calculated values.
     */
    public function toSummaryArray()
    {
        return [
            'id' => $this->id,
            'member' => [
                'id' => $this->member->id ?? null,
                'name' => $this->member->name ?? '?',
                'membership_number' => $this->member->membership_number ?? null,
            ],
            'role' => $this->role ?? 'athlete',
            'fee_amount' => (float) $this->fee_amount,
            'status' => $this->status,
            'extra_athletes' => (int) $this->extra_athletes,
            'extra_supporters' => (int) $this->extra_supporters,
            'extra_children' => (int) $this->extra_children,
            'notes' => $this->notes,
            'paid_amount' => $this->paid_amount,
            'remaining_amount' => $this->remaining_amount,
            'overpaid_amount' => $this->overpaid_amount,
            'payment_status' => $this->payment_status,
            'last_payment_at' => $this->last_payment_at,
        ];
    }
}
