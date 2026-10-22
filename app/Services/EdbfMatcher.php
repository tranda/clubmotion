<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Matches ClubMotion members to events-platform athletes (which have no
 * email), by name and birth date, to propose EDBF IDs.
 *
 * Match strength, best first:
 *  - exact:      same name (any word order, accents ignored) and same birth date
 *  - name:       same name, birth date missing on one side
 *  - dob_differs: same name, different birth dates  (needs a human check)
 *  - partial:    same birth date and at least one shared name word (needs a check)
 */
class EdbfMatcher
{
    public const SAFE = ['exact', 'name'];

    /**
     * @param array $members  [['id', 'name', 'date_of_birth' (Y-m-d|null), 'edbf_id'], ...]
     * @param array $athletes [['id', 'first_name', 'last_name', 'birth_date', 'edbf_id'], ...]
     * @return array{rows: array, unmatched: array}
     */
    public static function match(array $members, array $athletes): array
    {
        $athletes = array_values(array_filter($athletes, fn ($a) => trim((string) ($a['edbf_id'] ?? '')) !== ''));

        $prepared = array_map(fn ($a) => [
            'athlete' => $a,
            'name' => trim(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
            'words' => self::words(($a['first_name'] ?? '') . ' ' . ($a['last_name'] ?? '')),
            'dob' => self::date($a['birth_date'] ?? null),
        ], $athletes);

        $rows = [];
        $used = [];

        foreach ($members as $m) {
            $words = self::words($m['name'] ?? '');
            $dob = self::date($m['date_of_birth'] ?? null);
            $best = null;
            $candidates = [];

            foreach ($prepared as $i => $p) {
                $level = self::level($words, $dob, $p['words'], $p['dob']);
                if (!$level) {
                    continue;
                }
                $rank = array_search($level, ['exact', 'name', 'dob_differs', 'partial'], true);
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

            $level = ['exact', 'name', 'dob_differs', 'partial'][$best];
            foreach ($candidates as $i) {
                $used[$i] = true;
            }

            $p = $prepared[$candidates[0]];
            $proposed = trim((string) $p['athlete']['edbf_id']);
            $current = trim((string) ($m['edbf_id'] ?? ''));
            $ambiguous = count($candidates) > 1;

            $rows[] = [
                'member_id' => $m['id'],
                'member_name' => $m['name'],
                'member_dob' => $dob,
                'athlete_name' => $p['name'],
                'athlete_dob' => $p['dob'],
                'match' => $ambiguous ? 'ambiguous' : $level,
                'candidates' => $ambiguous ? array_map(fn ($i) => [
                    'name' => $prepared[$i]['name'],
                    'dob' => $prepared[$i]['dob'],
                    'edbf_id' => trim((string) $prepared[$i]['athlete']['edbf_id']),
                ], $candidates) : [],
                'current' => $current ?: null,
                'proposed' => $proposed,
                'status' => $current === '' ? 'new' : ($current === $proposed ? 'same' : 'different'),
            ];
        }

        $unmatched = [];
        foreach ($prepared as $i => $p) {
            if (!isset($used[$i])) {
                $unmatched[] = ['name' => $p['name'], 'dob' => $p['dob'], 'edbf_id' => trim((string) $p['athlete']['edbf_id'])];
            }
        }

        return ['rows' => $rows, 'unmatched' => $unmatched];
    }

    private static function level(array $mWords, ?string $mDob, array $aWords, ?string $aDob): ?string
    {
        if (!$mWords || !$aWords) {
            return null;
        }
        $sameName = $mWords === $aWords;
        if ($sameName) {
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
        $ascii = strtolower(Str::ascii($name));
        $words = preg_split('/[^a-z]+/', $ascii, -1, PREG_SPLIT_NO_EMPTY);
        sort($words);
        return $words;
    }

    private static function date($value): ?string
    {
        if (!$value) {
            return null;
        }
        $s = substr((string) $value, 0, 10);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && $s !== '0000-00-00' ? $s : null;
    }
}
