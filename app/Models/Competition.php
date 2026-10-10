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
        'currency', 'status', 'notes', 'room_counts', 'rooms_visible',
        'rooms_check_in', 'rooms_check_out', 'created_by',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'default_fee' => 'decimal:2',
        'room_counts' => 'array',
        'rooms_visible' => 'boolean',
        'rooms_check_in' => 'date:Y-m-d',
        'rooms_check_out' => 'date:Y-m-d',
    ];

    public function participants()
    {
        return $this->hasMany(CompetitionParticipant::class);
    }

    public function rooms()
    {
        return $this->hasMany(CompetitionRoom::class)->orderBy('number');
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
     * Default room check-in/check-out (Y-m-d or null): the planner default,
     * else the competition's start/end date.
     */
    public function defaultRoomDates()
    {
        $in = $this->rooms_check_in ?? $this->start_date;
        $out = $this->rooms_check_out ?? $this->end_date;

        return [
            'check_in' => $in ? $in->format('Y-m-d') : null,
            'check_out' => $out ? $out->format('Y-m-d') : null,
        ];
    }

    /**
     * Date range covering a set of participants' stays (a room's occupants):
     * earliest check-in, latest check-out, nights, and whether they differ.
     */
    public static function stayRange($participants, array $defaults)
    {
        $ins = [];
        $outs = [];
        foreach ($participants as $p) {
            $stay = $p->stay($defaults);
            if ($stay['check_in']) $ins[] = $stay['check_in'];
            if ($stay['check_out']) $outs[] = $stay['check_out'];
        }
        if (!$ins && !$outs) {
            $ins = array_filter([$defaults['check_in']]);
            $outs = array_filter([$defaults['check_out']]);
        }
        $in = $ins ? min($ins) : null;
        $out = $outs ? max($outs) : null;

        return [
            'check_in' => $in,
            'check_out' => $out,
            'nights' => $in && $out ? max(0, (int) round((strtotime($out) - strtotime($in)) / 86400)) : null,
            'mixed' => count(array_unique($ins)) > 1 || count(array_unique($outs)) > 1,
        ];
    }

    /**
     * Room types (bed counts) available, e.g. [2, 3]. Stored in room_counts
     * as {"1":0,"2":1,...}; any value above 0 means that type is available.
     */
    public function roomTypes()
    {
        $types = [];
        foreach (self::ROOM_SIZES as $size) {
            if ((int) ($this->room_counts[$size] ?? 0) > 0) {
                $types[] = $size;
            }
        }
        return $types;
    }

    /**
     * Accommodation plan per room size: whether that type is available,
     * people who prefer it (participant + their additional adults; children
     * don't take a bed) and rooms
     * needed if they share (ceil(people / beds)), with people without a
     * preference fitted into the available types. Cancelled participants are
     * excluded.
     */
    public function roomPlan($participants)
    {
        $available = $this->roomTypes();
        $people = array_fill_keys(self::ROOM_SIZES, 0);
        $noPreference = 0;

        foreach ($participants as $p) {
            if ($p->status === 'cancelled') {
                continue;
            }
            // Children don't take a bed (they share with their parent).
            $party = 1 + (int) $p->extra_athletes + (int) $p->extra_supporters;
            if ($p->preferred_room && isset($people[$p->preferred_room])) {
                $people[$p->preferred_room] += $party;
            } else {
                $noPreference += $party;
            }
        }

        $needed = [];
        foreach (self::ROOM_SIZES as $size) {
            $needed[$size] = (int) ceil($people[$size] / $size);
        }

        // Place people without a preference, counted per person:
        // 1. empty beds left in rooms already needed (available types only),
        // 2. then the largest available type, with the last few in the
        //    smallest available type that fits them.
        $remaining = $noPreference;
        $extra = array_fill_keys(self::ROOM_SIZES, 0);
        $desc = $available;
        rsort($desc);
        foreach ($desc as $size) {
            $spare = $needed[$size] * $size - $people[$size];
            $remaining -= min($spare, $remaining);
        }
        if ($remaining > 0 && $desc) {
            $largest = $desc[0];
            $extra[$largest] += intdiv($remaining, $largest);
            $rest = $remaining % $largest;
            if ($rest > 0) {
                foreach (array_reverse($desc) as $size) {
                    if ($size >= $rest) {
                        $extra[$size]++;
                        break;
                    }
                }
            }
            $remaining = 0;
        }

        $sizes = [];
        foreach (self::ROOM_SIZES as $size) {
            $sizes[] = [
                'beds' => $size,
                'available' => in_array($size, $available, true),
                'people' => $people[$size],
                'needed' => $needed[$size] + $extra[$size],
                'for_no_preference' => $extra[$size],
            ];
        }

        return [
            'sizes' => $sizes,
            'no_preference' => $noPreference,
            // People without a preference who couldn't be placed (no room types set).
            'unplaced' => $remaining,
            'total_rooms' => array_sum($needed) + array_sum($extra),
        ];
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
