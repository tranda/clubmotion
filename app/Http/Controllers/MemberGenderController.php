<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Fill members' missing gender from their first name. Staff review every
 * guess before anything is saved; members that already have a gender are
 * never touched.
 */
class MemberGenderController extends Controller
{
    // Male first names ending in "a" (otherwise "-a" means female).
    private const MALE_ENDING_A = [
        'nikola', 'luka', 'sava', 'andrija', 'ilija', 'toma', 'jovica', 'mica', 'mića', 'pera', 'djura', 'đura',
        'joca', 'boža', 'boza', 'jova', 'mija', 'kosta', 'braca', 'bata', 'gaja', 'aca', 'laza', 'raša', 'rasa',
        'paja', 'steva', 'vuja', 'zoka', 'žika', 'zika', 'mika', 'sima', 'jakša', 'jaksa', 'saša', 'sasa', 'aleksa',
    ];

    // Female first names not ending in "a".
    private const FEMALE_OTHER = [
        'ines', 'ivon', 'karmen', 'doris', 'nives', 'miriam', 'mirjam', 'ruth', 'nikolet', 'beatris', 'agnes',
        'elizabet', 'margit', 'edit', 'erzebet', 'ingrid', 'astrid', 'kerstin', 'katrin', 'karin', 'elen', 'helen',
        'ester', 'rahel', 'ivet', 'nadin', 'žaklin', 'zaklin', 'emili', 'lili', 'keti', 'meri', 'beti', 'jasmin',
    ];

    // Used for both men and women — always flagged for review.
    private const UNISEX = ['saša', 'sasa', 'vanja', 'aleksa', 'jasmin', 'andrea'];

    public function preview()
    {
        $members = Member::whereNull('gender')->orWhere('gender', '')
            ->orderBy('name')
            ->get(['id', 'name', 'membership_number', 'date_of_birth', 'is_active']);

        return Inertia::render('Members/GenderGuess', [
            'rows' => $members->map(function ($m) {
                [$guess, $sure] = $this->guess($m->name);
                return [
                    'id' => $m->id,
                    'name' => $m->name,
                    'membership_number' => $m->membership_number,
                    'is_active' => (bool) $m->is_active,
                    'guess' => $guess,
                    'sure' => $sure,
                ];
            })->values(),
        ]);
    }

    public function apply(Request $request)
    {
        $data = $request->validate([
            'genders' => 'required|array',
            'genders.*' => 'nullable|in:M,F',
        ]);

        $updated = 0;
        foreach ($data['genders'] as $id => $gender) {
            if (!$gender) {
                continue;
            }
            // Only fill empty values, never overwrite.
            $updated += Member::where('id', $id)
                ->where(fn ($q) => $q->whereNull('gender')->orWhere('gender', ''))
                ->update(['gender' => $gender]);
        }

        return redirect()->route('members.index')->with('success', "Gender set for {$updated} member(s)");
    }

    /**
     * [gender 'M'|'F'|null, sure bool] from the first word of the name.
     */
    private function guess(?string $name): array
    {
        $first = mb_strtolower(trim(Str::before(trim((string) $name), ' ')));
        if ($first === '') {
            return [null, false];
        }
        $ascii = mb_strtolower(Str::ascii($first));
        $is = fn (array $list) => in_array($first, $list, true) || in_array($ascii, $list, true);

        if ($is(self::MALE_ENDING_A)) {
            return ['M', !$is(self::UNISEX)];
        }
        if ($is(self::FEMALE_OTHER)) {
            return ['F', !$is(self::UNISEX)];
        }
        $gender = Str::endsWith($ascii, 'a') ? 'F' : 'M';

        return [$gender, !$is(self::UNISEX)];
    }
}
