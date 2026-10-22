<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\ToolSetting;
use App\Services\EdbfMatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

/**
 * Settings → Events platform: connection to events.motion.rs, and pulling our
 * club's athletes' EDBF IDs onto members. Staff review every row before
 * saving; an existing EDBF ID is only replaced when explicitly ticked.
 */
class MemberEdbfController extends Controller
{
    public const DEFAULT_URL = 'https://events.motion.rs/api';

    public function settings()
    {
        $conn = self::connection();

        return Inertia::render('Settings/Events', [
            'url' => $conn['url'],
            'club' => $conn['club'],
            'hasKey' => (bool) $conn['key'],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'url' => 'required|url|max:255',
            'club' => 'required|string|max:255',
            'key' => 'nullable|string|max:255',
            'remove_key' => 'nullable|boolean',
        ]);

        ToolSetting::set('events_api_url', rtrim($data['url'], '/'), 'Events platform: API base URL');
        ToolSetting::set('events_club', trim($data['club']), 'Events platform: club name or id');

        if (!empty($data['key'])) {
            ToolSetting::set('events_api_key', Crypt::encryptString(trim($data['key'])), 'Events platform: API key (encrypted)');
        } elseif ($request->boolean('remove_key')) {
            ToolSetting::set('events_api_key', '');
        }

        return back()->with('success', 'Events platform settings saved.');
    }

    public function preview()
    {
        $conn = self::connection();

        if (!$conn['key']) {
            return $this->render(['error' => 'No API key yet. Add the events platform API key in Settings → Events platform.']);
        }

        try {
            $response = Http::withHeaders(['X-API-Key' => $conn['key']])
                ->acceptJson()
                ->timeout(20)
                ->get($conn['url'] . '/athletes/for-club', is_numeric($conn['club']) ? ['club_id' => $conn['club']] : ['club' => $conn['club']]);
        } catch (\Throwable $e) {
            return $this->render(['error' => 'Could not reach the events platform: ' . $e->getMessage()]);
        }

        if (!$response->successful()) {
            $msg = $response->json('message') ?: ('HTTP ' . $response->status());
            return $this->render(['error' => 'Events platform refused the request: ' . $msg]);
        }

        $athletes = $response->json('data') ?? [];
        $members = Member::orderBy('name')->get(['id', 'name', 'date_of_birth', 'edbf_id'])
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'date_of_birth' => $m->date_of_birth ? $m->date_of_birth->format('Y-m-d') : null,
                'edbf_id' => $m->edbf_id,
            ])->all();

        $result = EdbfMatcher::match($members, $athletes);

        return $this->render([
            'club' => $response->json('club.name') ?? $conn['club'],
            'athleteCount' => count($athletes),
            'withEdbf' => count(array_filter($athletes, fn ($a) => trim((string) ($a['edbf_id'] ?? '')) !== '')),
            'rows' => $result['rows'],
            'unmatched' => $result['unmatched'],
        ]);
    }

    public function apply(Request $request)
    {
        $data = $request->validate([
            'edbf_ids' => 'required|array',
            'edbf_ids.*' => 'required|string|max:50',
        ]);

        $count = 0;
        foreach ($data['edbf_ids'] as $memberId => $edbfId) {
            $member = Member::find($memberId);
            if ($member && $member->edbf_id !== trim($edbfId)) {
                $member->edbf_id = trim($edbfId);
                $member->save();
                $count++;
            }
        }

        return redirect('/settings/events/edbf-sync')->with('success', "EDBF ID saved for {$count} member(s).");
    }

    /** Saved settings win; .env values (EVENTS_API_*) are the fallback. */
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
            'url' => ToolSetting::get('events_api_url') ?: rtrim((string) config('services.events.url', self::DEFAULT_URL), '/'),
            'club' => ToolSetting::get('events_club') ?: (string) config('services.events.club', 'Motion'),
            'key' => $key ?: config('services.events.key'),
        ];
    }

    private function render(array $props)
    {
        return Inertia::render('Settings/EdbfSync', $props + [
            'error' => null, 'club' => null, 'athleteCount' => 0, 'withEdbf' => 0,
            'rows' => [], 'unmatched' => [], 'safe' => EdbfMatcher::SAFE,
        ]);
    }
}
