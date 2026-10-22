<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Pairs ClubMotion members with events-platform athletes (which have no
 * email), by name and birth date, so their fields can be synced.
 *
 * Match strength, best first:
 *  - exact:       same name (any word order, accents ignored) and same birth date
 *  - name:        same name, birth date missing on one side
 *  - dob_differs: same name, different birth dates  (needs a human check)
 *  - partial:     same birth date and at least one shared name word (needs a check)
 * A member that matches several athletes equally well is "ambiguous" and is
 * never synced automatically.
 */
class AthleteMatcher
{
    public const SAFE = ['exact', 'name'];
    private const LEVELS = ['exact', 'name', 'dob_differs', 'partial'];

    /**
     * @param array $members  [['id', 'name', 'date_of_birth', 'gender' (M|F|null), 'edbf_id'], ...]
     * @param array $athletes [['id', 'first_name', 'last_name', 'birth_date', 'gender' (Male|Female), 'edbf_id'], ...]
     * @return array{pairs: array, ambiguous: array, unmatched: array}
     */
    public static function match(array $members, array $athletes): array
    {
        $prepared = array_map(fn ($a) => [
            'id' => $a['id'] ?? null,
            'name' => trim(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
            'words' => self::words(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
            'fields' => [
                'edbf_id' => self::text($a['edbf_id'] ?? null),
                'birth_date' => self::date($a['birth_date'] ?? null),
                'gender' => self::gender($a['gender'] ?? null),
            ],
        ], $athletes);

        $pairs = [];
        $ambiguous = [];
        $used = [];

        foreach ($members as $m) {
            $words = self::words($m['name'] ?? '');
            $dob = self::date($m['date_of_birth'] ?? null);
            $best = null;
            $candidates = [];

            foreach ($prepared as $i => $p) {
                $level = self::level($words, $dob, $p['words'], $p['fields']['birth_date']);
                if (!$level) {
                    continue;
                }
                $rank = array_search($level, self::LEVELS, true);
                if ($best === null || $rank < $best) {
                    $best = $rank;
                    $candidates = [];
                }
                if ($rank === $best) {
                    $candidates[] = $i;
                }
            }

            if ($best === null) {
                continue;
            }
            foreach ($candidates as $i) {
                $used[$i] = true;
            }

            $club = [
                'edbf_id' => self::text($m['edbf_id'] ?? null),
                'birth_date' => $dob,
                'gender' => self::gender($m['gender'] ?? null),
            ];

            if (count($candidates) > 1) {
                $ambiguous[] = [
                    'member_id' => $m['id'],
                    'member_name' => $m['name'],
                    'club' => $club,
                    'candidates' => array_map(fn ($i) => ['name' => $prepared[$i]['name']] + $prepared[$i]['fields'], $candidates),
                ];
                continue;
            }

            $p = $prepared[$candidates[0]];
            $pairs[] = [
                'member_id' => $m['id'],
                'member_name' => $m['name'],
                'athlete_id' => $p['id'],
                'athlete_name' => $p['name'],
                'match' => self::LEVELS[$best],
                'club' => $club,
                'events' => $p['fields'],
            ];
        }

        $unmatched = [];
        foreach ($prepared as $i => $p) {
            if (!isset($used[$i])) {
                $unmatched[] = ['name' => $p['name']] + $p['fields'];
            }
        }

        return ['pairs' => $pairs, 'ambiguous' => $ambiguous, 'unmatched' => $unmatched];
    }

    private static function level(array $mWords, ?string $mDob, array $aWords, ?string $aDob): ?string
    {
        if (!$mWords || !$aWords) {
            return null;
        }
        if ($mWords === $aWords) {
            if ($mDob && $aDob) {
                return $mDob === $aDob ? 'exact' : 'dob_differs';
            }
            return 'name';
        }
        if ($mDob && $aDob && $mDob === $aDob && array_intersect($mWords, $aWords)) {
            return 'partial';
        }
        return null;
    }

    /** Lowercase ASCII name words, sorted, so "Petrović Ana" == "ana petrovic". */
    public static function words(string $name): array
    {
        $name = str_replace(['đ', 'Đ'], 'dj', $name);
        $words = preg_split('/[^a-z]+/', strtolower(Str::ascii($name)), -1, PREG_SPLIT_NO_EMPTY);
        sort($words);
        return $words;
    }

    private static function text($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    private static function date($value): ?string
    {
        if (!$value) {
            return null;
        }
        $s = substr((string) $value, 0, 10);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && $s !== '0000-00-00' ? $s : null;
    }

    /** Both apps' gender values as M / F (events uses Male / Female). */
    public static function gender($value): ?string
    {
        $v = strtoupper(substr(trim((string) $value), 0, 1));
        return in_array($v, ['M', 'F'], true) ? $v : null;
    }
}
