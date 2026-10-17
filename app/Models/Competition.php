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
        'rooms_check_in', 'rooms_check_out', 'accommodation', 'created_by',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'default_fee' => 'decimal:2',
        'room_counts' => 'array',
        'rooms_visible' => 'boolean',
        'rooms_check_in' => 'date:Y-m-d',
        'rooms_check_out' => 'date:Y-m-d',
        'accommodation' => 'array',
    ];

    public function participants()
    {
        return $this->hasMany(CompetitionParticipant::class);
    }

    public function rooms()
    {
        // By the number shown on the room ("Room 205" → 205): its title when set,
        // else its own number; titles without a number come first, then by title.
        return $this->hasMany(CompetitionRoom::class)
            ->orderByRaw("CAST(REPLACE(COALESCE(NULLIF(name, ''), number), 'Room ', '') AS UNSIGNED)")
            ->orderBy('name')
            ->orderBy('number');
    }

    public function roomSnapshots()
    {
        return $this->hasMany(CompetitionRoomSnapshot::class)->latest();
    }

    public function organizerPayments()
    {
        return $this->hasMany(CompetitionOrganizerPayment::class)->orderByDesc('paid_at')->orderByDesc('id');
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
     * Accommodation settings with defaults:
     * prices (per person for the whole package, keyed by beds), supporter_discount,
     * charge_empty_beds.
     */
    public function accommodationSettings()
    {
        $a = $this->accommodation ?? [];
        $prices = [];
        foreach (self::ROOM_SIZES as $size) {
            $v = $a['prices'][$size] ?? $a['prices'][(string) $size] ?? null;
            $prices[$size] = $v === null || $v === '' ? null : (float) $v;
        }

        $bands = [];
        foreach ($a['child_bands'] ?? self::DEFAULT_CHILD_BANDS as $band) {
            $price = $band['price'] ?? null;
            $bands[] = [
                'label' => (string) ($band['label'] ?? ''),
                'max_age' => (int) ($band['max_age'] ?? 0),
                'price' => $price === null || $price === '' ? null : (float) $price,
                'takes_bed' => (bool) ($band['takes_bed'] ?? true),
            ];
        }
        usort($bands, fn ($x, $y) => $x['max_age'] <=> $y['max_age']);

        return [
            'prices' => $prices,
            'supporter_discount' => (float) ($a['supporter_discount'] ?? 0),
            'charge_empty_beds' => (bool) ($a['charge_empty_beds'] ?? true),
            'child_bands' => $bands,
        ];
    }

    // Age bands for children (age at check-in). price = per child for the
    // whole stay (null = same as an adult bed), takes_bed = counts as a bed.
    public const DEFAULT_CHILD_BANDS = [
        ['label' => 'Babies', 'max_age' => 1, 'price' => 0, 'takes_bed' => false],
        ['label' => 'Children', 'max_age' => 6, 'price' => null, 'takes_bed' => true],
        ['label' => 'Teens', 'max_age' => 17, 'price' => null, 'takes_bed' => true],
    ];

    /**
     * Each child of a participant with age (at their check-in) and band:
     * [['dob', 'age', 'band' (array|null = adult), 'takes_bed', 'price']].
     * Unknown DOB → treated as before (free, no bed), band 'unknown'.
     */
    public function childrenOf($p, ?array $settings = null, ?array $defaults = null)
    {
        $settings = $settings ?? $this->accommodationSettings();
        $defaults = $defaults ?? $this->defaultRoomDates();
        $at = $p->stay($defaults)['check_in'] ?? null;
        $at = $at ?: ($this->start_date ? $this->start_date->format('Y-m-d') : date('Y-m-d'));

        $children = [];
        foreach ($p->childrenDobs() as $dob) {
            if (!$dob) {
                $children[] = ['dob' => null, 'age' => null, 'band' => 'unknown', 'takes_bed' => false, 'price' => 0.0];
                continue;
            }
            $age = \Carbon\Carbon::parse($dob)->diffInYears(\Carbon\Carbon::parse($at));
            $band = null;
            foreach ($settings['child_bands'] as $b) {
                if ($age <= $b['max_age']) {
                    $band = $b;
                    break;
                }
            }
            // Older than every band → priced and counted like an adult.
            $children[] = [
                'dob' => $dob,
                'age' => $age,
                'band' => $band ? $band['label'] : null,
                'takes_bed' => $band ? $band['takes_bed'] : true,
                'price' => $band ? $band['price'] : null,
            ];
        }
        return $children;
    }

    /**
     * Beds a participant's party takes: participant + additional athletes and
     * supporters + children whose age band takes a bed.
     */
    public function bedsFor($p, ?array $settings = null, ?array $defaults = null)
    {
        $kids = collect($this->childrenOf($p, $settings, $defaults))->where('takes_bed', true)->count();
        return 1 + (int) $p->extra_athletes + (int) $p->extra_supporters + $kids;
    }

    /**
     * Every person in a participant's party, each with their own room:
     * the participant ("main") plus additional athletes, supporters and
     * children ("athlete:1", "supporter:2", "child:1", …). Additional people
     * stay in the participant's room unless separated in the room planner
     * (split_extras: {"supporter:1": room_id|null}).
     */
    public function partyPersons($p, ?array $settings = null, ?array $defaults = null)
    {
        $settings = $settings ?? $this->accommodationSettings();
        $defaults = $defaults ?? $this->defaultRoomDates();
        $split = (array) ($p->split_extras ?? []);
        $room = fn ($slot) => array_key_exists($slot, $split)
            ? ($split[$slot] !== null ? (int) $split[$slot] : null)
            : $p->competition_room_id;
        $name = $p->member->name ?? '?';
        $first = \Illuminate\Support\Str::before(trim($name), ' ') ?: $name;

        $persons = [[
            'slot' => 'main', 'label' => $name, 'kind' => 'adult', 'supporter' => $p->role === 'supporter',
            'takes_bed' => true, 'price' => null, 'age' => null, 'room_id' => $p->competition_room_id, 'split' => false,
        ]];
        foreach (['athlete' => (int) $p->extra_athletes, 'supporter' => (int) $p->extra_supporters] as $type => $n) {
            for ($i = 1; $i <= $n; $i++) {
                $slot = "{$type}:{$i}";
                $persons[] = [
                    'slot' => $slot, 'label' => "{$first}'s {$type} #{$i}", 'kind' => 'adult', 'supporter' => $type === 'supporter',
                    'takes_bed' => true, 'price' => null, 'age' => null, 'room_id' => $room($slot), 'split' => array_key_exists($slot, $split),
                ];
            }
        }
        foreach ($this->childrenOf($p, $settings, $defaults) as $i => $child) {
            $slot = 'child:' . ($i + 1);
            $persons[] = [
                'slot' => $slot,
                'label' => "{$first}'s child #" . ($i + 1) . ($child['age'] !== null ? " ({$child['age']})" : ''),
                'kind' => 'child', 'supporter' => false, 'takes_bed' => $child['takes_bed'],
                'price' => $child['band'] === 'unknown' ? 0.0 : $child['price'], 'age' => $child['age'],
                'room_id' => $room($slot), 'split' => array_key_exists($slot, $split),
            ];
        }
        return $persons;
    }

    /**
     * What the room planner places: the participant together with the
     * additional people still with them (one unit), plus each separated person
     * as their own unit. [['key', 'slot', 'label', 'beds', 'room_id', 'participant_id']]
     */
    public function unitsFor($p, ?array $settings = null, ?array $defaults = null)
    {
        $persons = $this->partyPersons($p, $settings, $defaults);
        $together = array_values(array_filter($persons, fn ($x) => !$x['split']));
        $counts = ['athlete' => 0, 'supporter' => 0, 'child' => 0];
        $ages = [];
        foreach ($together as $x) {
            if ($x['slot'] === 'main') continue;
            $type = strtok($x['slot'], ':');
            $counts[$type]++;
            if ($type === 'child') $ages[] = $x['age'] ?? '?';
        }
        $extras = [];
        foreach (['athlete' => ['athlete', 'athletes'], 'supporter' => ['supporter', 'supporters'], 'child' => ['child', 'children']] as $type => [$one, $many]) {
            if ($counts[$type] > 0) {
                $extras[] = '+' . $counts[$type] . ' ' . ($counts[$type] === 1 ? $one : $many) . ($type === 'child' && $ages ? ' (' . implode(', ', $ages) . ')' : '');
            }
        }

        $units = [[
            'key' => "{$p->id}:main", 'slot' => 'main', 'participant_id' => $p->id,
            'label' => $persons[0]['label'], 'extras' => implode(', ', $extras),
            'beds' => count(array_filter($together, fn ($x) => $x['takes_bed'])),
            'room_id' => $p->competition_room_id,
        ]];
        foreach ($persons as $x) {
            if ($x['split']) {
                $units[] = [
                    'key' => "{$p->id}:{$x['slot']}", 'slot' => $x['slot'], 'participant_id' => $p->id,
                    'label' => $x['label'], 'extras' => '', 'beds' => $x['takes_bed'] ? 1 : 0, 'room_id' => $x['room_id'],
                ];
            }
        }
        return $units;
    }

    /**
     * Accommodation cost per participant and per room, computed per person.
     *
     * Per-person price is for the package (default stay). A room costs
     * price × beds when empty beds are charged (split among the people taking
     * a bed in it), else price per person. Adults pay a bed share, children
     * their band price (null = a bed share); supporters get the discount.
     * Each person's cost goes to their participant, pro-rated by the
     * participant's nights ÷ package nights. Cancelled participants and people
     * not in a room cost nothing.
     */
    public function accommodationCosts($participants, $rooms)
    {
        $settings = $this->accommodationSettings();
        $defaults = $this->defaultRoomDates();
        $packageNights = $defaults['check_in'] && $defaults['check_out']
            ? max(0, (int) round((strtotime($defaults['check_out']) - strtotime($defaults['check_in'])) / 86400))
            : null;
        $active = collect($participants)->where('status', '!=', 'cancelled');

        // Everyone, with their participant's pro-rating factor.
        $people = [];
        foreach ($active as $p) {
            $factor = 1.0;
            $stay = $p->stay($defaults);
            if ($packageNights && $stay['check_in'] && $stay['check_out']) {
                $nights = max(0, (int) round((strtotime($stay['check_out']) - strtotime($stay['check_in'])) / 86400));
                $factor = $nights / $packageNights;
            }
            foreach ($this->partyPersons($p, $settings, $defaults) as $x) {
                $people[] = $x + ['participant_id' => $p->id, 'factor' => $factor];
            }
        }

        $perParticipant = [];
        $perUnit = [];
        $perRoom = [];
        foreach ($rooms as $room) {
            $inRoom = array_values(array_filter($people, fn ($x) => $x['room_id'] === $room->id));
            $price = $settings['prices'][$room->beds] ?? null;
            if ($price === null) {
                $perRoom[$room->id] = ['price' => null, 'total' => null];
                continue;
            }
            $used = count(array_filter($inRoom, fn ($x) => $x['takes_bed']));
            // Cost of one bed-taking person in this room.
            $share = $settings['charge_empty_beds'] && $used > 0 && $used < $room->beds
                ? $price * $room->beds / $used
                : $price;

            $roomTotal = 0.0;
            foreach ($inRoom as $x) {
                $cost = $x['kind'] === 'child' && $x['price'] !== null ? (float) $x['price'] : $share;
                if ($x['supporter']) {
                    $cost = max(0, $cost - $settings['supporter_discount']);
                }
                $cost *= $x['factor'];
                $perParticipant[$x['participant_id']] = ($perParticipant[$x['participant_id']] ?? 0) + $cost;
                // Per planner unit: separated people on their own, the rest with the participant.
                $unit = $x['participant_id'] . ':' . ($x['split'] ? $x['slot'] : 'main');
                $perUnit[$unit] = ($perUnit[$unit] ?? 0) + $cost;
                $roomTotal += $cost;
            }
            $perRoom[$room->id] = ['price' => $price, 'total' => round($roomTotal, 2)];
        }
        $perParticipant = array_map(fn ($v) => round($v, 2), $perParticipant);
        $perUnit = array_map(fn ($v) => round($v, 2), $perUnit);

        return [
            'settings' => $settings,
            'package_nights' => $packageNights,
            'participants' => (object) $perParticipant,
            'units' => (object) $perUnit,
            'rooms' => (object) $perRoom,
            'total' => round(array_sum($perParticipant), 2),
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
            // Children take a bed depending on their age band.
            $party = $this->bedsFor($p);
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
