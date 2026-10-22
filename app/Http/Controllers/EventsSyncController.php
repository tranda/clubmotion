<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\ToolSetting;
use App\Services\AthleteMatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

/**
 * Settings → Events platform: connection to events.motion.rs and a two-way
 * sync of member fields (EDBF ID, birth date, gender) with our club's
 * athletes there. Staff pick the fields and direction, review every row and
 * save only what they tick.
 */
class EventsSyncController extends Controller
{
    public const DEFAULT_URL = 'https://events.motion.rs/api';

    public function settings()
    {
        $conn = self::connection();

        return Inertia::render('Settings/Events', [
            'url' => $conn['url'],
            'club' => $conn['club'],
            'hasKey' => (bool) $conn['key'],
            'canEdit' => optional(auth()->user()->role)->name === 'admin',
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'club' => 'required|string|max:255',
            'key' => 'nullable|string|max:255',
            'remove_key' => 'nullable|boolean',
        ]);

        ToolSetting::set('events_club', trim($data['club']), 'Events platform: club name or id');

        if (!empty($data['key'])) {
            ToolSetting::set('events_api_key', Crypt::encryptString(trim($data['key'])), 'Events platform: API key (encrypted)');
        } elseif ($request->boolean('remove_key')) {
            ToolSetting::set('events_api_key', '');
        }

        return back()->with('success', 'Events platform settings saved.');
    }

    /** Fetch athletes, pair them with members and show the review page. */
    public function preview()
    {
        $conn = self::connection();

        if (!$conn['key']) {
            return $this->render(['error' => 'No API key yet. Add the events platform API key in Settings → Events platform.']);
        }

        try {
            $response = $this->client($conn)->get($conn['url'] . '/athletes/for-club', self::clubParam($conn));
        } catch (\Throwable $e) {
            return $this->render(['error' => 'Could not reach the events platform: ' . $e->getMessage()]);
        }

        if (!$response->successful()) {
            return $this->render(['error' => 'Events platform refused the request: ' . self::message($response)]);
        }

        $athletes = $response->json('data') ?? [];
        $members = Member::orderBy('name')->get(['id', 'name', 'date_of_birth', 'gender', 'edbf_id'])
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'date_of_birth' => $m->date_of_birth ? $m->date_of_birth->format('Y-m-d') : null,
                'gender' => $m->gender,
                'edbf_id' => $m->edbf_id,
            ])->all();

        $result = AthleteMatcher::match($members, $athletes);

        return $this->render([
            'club' => $response->json('club.name') ?? $conn['club'],
            'athleteCount' => count($athletes),
            'memberCount' => count($members),
        ] + $result);
    }

    /** Events → ClubMotion: save the ticked values on members. */
    public function pull(Request $request)
    {
        $data = $request->validate([
            'updates' => 'required|array',
            'updates.*.edbf_id' => 'sometimes|string|max:50',
            'updates.*.birth_date' => 'sometimes|date_format:Y-m-d',
            'updates.*.gender' => 'sometimes|in:M,F',
        ]);

        $count = 0;
        foreach ($data['updates'] as $memberId => $fields) {
            $member = Member::find($memberId);
            if (!$member) {
                continue;
            }
            if (isset($fields['edbf_id'])) {
                $member->edbf_id = trim($fields['edbf_id']);
            }
            if (isset($fields['birth_date'])) {
                $member->date_of_birth = $fields['birth_date'];
            }
            if (isset($fields['gender'])) {
                $member->gender = $fields['gender'];
            }
            if ($member->isDirty()) {
                $member->save();
                $count++;
            }
        }

        return redirect('/settings/events/sync')->with('success', "Updated {$count} member(s) in ClubMotion.");
    }

    /** ClubMotion → Events: send the ticked values to the events platform. */
    public function push(Request $request)
    {
        $data = $request->validate([
            'updates' => 'required|array|max:500',
            'updates.*.id' => 'required|integer',
            'updates.*.edbf_id' => 'sometimes|string|max:50',
            'updates.*.birth_date' => 'sometimes|date_format:Y-m-d',
            'updates.*.gender' => 'sometimes|in:M,F',
        ]);

        $updates = array_map(function ($u) {
            if (isset($u['gender'])) {
                $u['gender'] = $u['gender'] === 'M' ? 'Male' : 'Female';
            }
            return $u;
        }, array_values($data['updates']));

        $conn = self::connection();
        try {
            $response = $this->client($conn)->post($conn['url'] . '/athletes/for-club/update', self::clubParam($conn) + ['updates' => $updates]);
        } catch (\Throwable $e) {
            return back()->with('error', 'Could not reach the events platform: ' . $e->getMessage());
        }

        if (!$response->successful()) {
            return back()->with('error', 'Events platform refused the update: ' . self::message($response)
                . ($response->status() === 403 ? ' (the API key needs the athletes.write permission)' : ''));
        }

        $updated = (int) $response->json('updated');
        $skipped = count($response->json('skipped') ?? []);

        return redirect('/settings/events/sync')->with('success', "Updated {$updated} athlete(s) on the events platform."
            . ($skipped ? " {$skipped} skipped (not in our club there)." : ''));
    }

    /**
     * Key and club come from Settings (.env as fallback). The address is fixed
     * in config (EVENTS_API_URL, https only) so the saved key can't be sent to
     * another server from the UI.
     */
    public static function connection(): array
    {
        $key = ToolSetting::get('events_api_key');
        if ($key) {
            try {
                $key = Crypt::decryptString($key);
            } catch (\Throwable $e) {
                $key = null;
            }
        }

        return [
            'url' => self::apiUrl(),
            'club' => ToolSetting::get('events_club') ?: (string) config('services.events.club', 'Motion'),
            'key' => $key ?: config('services.events.key'),
        ];
    }

    private static function apiUrl(): string
    {
        $url = rtrim((string) config('services.events.url', self::DEFAULT_URL), '/');
        return str_starts_with($url, 'https://') ? $url : self::DEFAULT_URL;
    }

    private function client(array $conn)
    {
        // No redirects: the key header would be forwarded to wherever a redirect points.
        return Http::withHeaders(['X-API-Key' => $conn['key']])->acceptJson()->timeout(30)->withoutRedirecting();
    }

    private static function clubParam(array $conn): array
    {
        return is_numeric($conn['club']) ? ['club_id' => (int) $conn['club']] : ['club' => $conn['club']];
    }

    private static function message($response): string
    {
        return $response->json('message') ?: ('HTTP ' . $response->status());
    }

    private function render(array $props)
    {
        return Inertia::render('Settings/EventsSync', $props + [
            'error' => null, 'club' => null, 'athleteCount' => 0, 'memberCount' => 0,
            'pairs' => [], 'ambiguous' => [], 'unmatched' => [], 'safe' => AthleteMatcher::SAFE,
        ]);
    }
}
