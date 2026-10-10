<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Competition extends Model
{
    public const CURRENCIES = ['EUR', 'RSD'];
    public const STATUSES = ['planned', 'active', 'closed'];

    public const ROOM_SIZES = [1, 2, 3, 4, 5];

    protected $fillable = [
        'name', 'location', 'start_date', 'end_date', 'default_fee',
        'currency', 'status', 'notes', 'room_counts', 'created_by',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'default_fee' => 'decimal:2',
        'room_counts' => 'array',
    ];

    public function participants()
    {
        return $this->hasMany(CompetitionParticipant::class);
    }

    public function payments()
    {
        return $this->hasManyThrough(CompetitionPayment::class, CompetitionParticipant::class);
    }

    /**
     * Year the competition belongs to: its start date, else when it was created.
     */
    public function getYearAttribute()
    {
        return (int) ($this->start_date ?? $this->created_at)->format('Y');
    }

    /**
     * Rooms available per bed count, always with keys 1..5.
     */
    public function roomCounts()
    {
        $counts = [];
        foreach (self::ROOM_SIZES as $size) {
            $counts[$size] = (int) ($this->room_counts[$size] ?? $this->room_counts[(string) $size] ?? 0);
        }
        return $counts;
    }

    /**
     * Accommodation plan per room size: rooms available, people who prefer
     * that size (participant + their additional people) and rooms needed if
     * they share (ceil(people / beds)). Cancelled participants are excluded.
     */
    public function roomPlan($participants)
    {
        $available = $this->roomCounts();
        $people = array_fill_keys(self::ROOM_SIZES, 0);
        $noPreference = 0;

        foreach ($participants as $p) {
            if ($p->status === 'cancelled') {
                continue;
            }
            $party = 1 + (int) $p->extra_athletes + (int) $p->extra_supporters + (int) $p->extra_children;
            if ($p->preferred_room && isset($people[$p->preferred_room])) {
                $people[$p->preferred_room] += $party;
            } else {
                $noPreference += $party;
            }
        }

        $sizes = [];
        foreach (self::ROOM_SIZES as $size) {
            $sizes[] = [
                'beds' => $size,
                'available' => $available[$size],
                'people' => $people[$size],
                'needed' => (int) ceil($people[$size] / $size),
            ];
        }

        return ['sizes' => $sizes, 'no_preference' => $noPreference];
    }

    /**
     * Financial totals for a set of participants (loaded with payment sums).
     *
     * Expected/remaining only count active participants; cancelled and exempt
     * ones are excluded. Remaining is the sum of what each active participant
     * still owes, so one member's overpayment never hides another's debt.
     * Collected is every payment received, whatever the participant's status.
     */
    public static function totalsFor($participants)
    {
        $totals = [
            'expected' => 0.0, 'collected' => 0.0, 'remaining' => 0.0, 'overpaid' => 0.0,
            'participants' => 0, 'paid' => 0, 'partial' => 0, 'unpaid' => 0,
            'exempt' => 0, 'cancelled' => 0, 'overpaid_count' => 0,
            // Headcount of people going (participants + their additional people).
            'people' => ['athletes' => 0, 'supporters' => 0, 'children' => 0],
        ];

        foreach ($participants as $p) {
            $totals['collected'] += $p->paid_amount;

            if ($p->status === 'cancelled') {
                $totals['cancelled']++;
                continue;
            }

            $totals['participants']++;
            $totals['people'][$p->role === 'supporter' ? 'supporters' : 'athletes']++;
            $totals['people']['athletes'] += (int) $p->extra_athletes;
            $totals['people']['supporters'] += (int) $p->extra_supporters;
            $totals['people']['children'] += (int) $p->extra_children;
            $status = $p->payment_status;
            if ($status === 'overpaid') {
                $totals['paid']++;
                $totals['overpaid_count']++;
            } else {
                $totals[$status]++;
            }

            if ($status !== 'exempt') {
                $totals['expected'] += (float) $p->fee_amount;
                $totals['remaining'] += $p->remaining_amount;
                $totals['overpaid'] += $p->overpaid_amount;
            }
        }

        foreach (['expected', 'collected', 'remaining', 'overpaid'] as $k) {
            $totals[$k] = round($totals[$k], 2);
        }

        return $totals;
    }
}
