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
        'created_by'
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
}