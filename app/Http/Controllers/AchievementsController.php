<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Achievement;
use App\Models\Member;
use Inertia\Inertia;

class AchievementsController extends Controller
{
    /**
     * Display combined achievements page (personal + club)
     */
    public function index()
    {
        $user = auth()->user();

        // Get user's member record
        $member = $user->member;

        // Personal achievements
        $myAchievements = [];
        $myAchievementsByEvent = [];
        $myAchievementKeys = [];

        if ($member) {
            // Fetch achievements for this member
            $myAchievements = Achievement::where('member_id', $member->id)
                ->orderByDesc('year')
                ->orderBy('event_name')
                ->orderBy('competition_class')
                ->get();

            // Group by event name
            $myAchievementsByEvent = $myAchievements->groupBy('event_name');

            // Create keys for quick lookup (event_name|competition_class|medal)
            $myAchievementKeys = $myAchievements->map(function($achievement) {
                return $achievement->event_name . '|' . $achievement->competition_class . '|' . $achievement->medal;
            })->toArray();
        }

        // Club-wide unique achievements
        $clubAchievements = Achievement::select('competition_class', 'medal', 'event_name', 'year')
            ->distinct()
            ->orderByDesc('year')
            ->orderBy('event_name')
            ->orderBy('competition_class')
            ->get();

        $clubAchievementsByEvent = $clubAchievements->groupBy('event_name');

        return Inertia::render('Achievements/Index', [
            'myAchievements' => $myAchievements,
            'myAchievementsByEvent' => $myAchievementsByEvent,
            'myAchievementKeys' => $myAchievementKeys,
            'clubAchievements' => $clubAchievements,
            'clubAchievementsByEvent' => $clubAchievementsByEvent,
        ]);
    }

    /**
     * Display club-wide unique achievements
     */
    public function clubAchievements()
    {
        // Get all unique achievements (one entry per event/class/medal combo)
        $uniqueAchievements = Achievement::select('competition_class', 'medal', 'event_name', 'year')
            ->distinct()
            ->orderByDesc('year')
            ->orderBy('event_name')
            ->orderBy('competition_class')
            ->get();

        // Group achievements by event name
        $achievementsByEvent = $uniqueAchievements->groupBy('event_name');

        return Inertia::render('Achievements/Club', [
            'achievements' => $uniqueAchievements,
            'achievementsByEvent' => $achievementsByEvent,
        ]);
    }

    /**
     * Base URL for the dbcrews public feed (no trailing slash).
     */
    private function dbcrewsBase(): string
    {
        return rtrim(config('services.dbcrews.base_url'), '/');
    }

    /**
     * Build an HTTP client for dbcrews, attaching the API key when configured.
     */
    private function dbcrewsClient()
    {
        $client = Http::acceptJson()->timeout(20);

        $key = config('services.dbcrews.key');
        if (!empty($key)) {
            $client = $client->withHeaders(['X-Api-Key' => $key]);
        }

        return $client;
    }

    /**
     * Show the "Pull from dbcrews" page.
     */
    public function showPull()
    {
        return Inertia::render('Achievements/PullDbcrews');
    }

    /**
     * Proxy: list dbcrews teams. Keeps the API key server-side.
     */
    public function dbcrewsTeams()
    {
        try {
            $response = $this->dbcrewsClient()->get($this->dbcrewsBase() . '/teams');

            if ($response->failed()) {
                return response()->json(['error' => 'dbcrews returned status ' . $response->status()], 502);
            }

            return response()->json(['teams' => $response->json('teams', [])]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Could not reach dbcrews: ' . $e->getMessage()], 502);
        }
    }

    /**
     * Proxy: list competitions for a team.
     */
    public function dbcrewsCompetitions(Request $request)
    {
        $request->validate(['team' => 'required']);

        try {
            $response = $this->dbcrewsClient()->get($this->dbcrewsBase() . '/competitions', [
                'team' => $request->query('team'),
            ]);

            if ($response->failed()) {
                return response()->json(['error' => 'dbcrews returned status ' . $response->status()], 502);
            }

            return response()->json(['competitions' => $response->json('competitions', [])]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Could not reach dbcrews: ' . $e->getMessage()], 502);
        }
    }

    /**
     * Pull results from dbcrews and insert new achievements.
     *
     * Insert-only, keyed by (member_id, event_name, competition_class, medal).
     * Never updates or deletes existing rows.
     */
    public function pullFromDbcrews(Request $request)
    {
        $validated = $request->validate([
            'team' => 'required',
            'competition' => 'nullable',
            'dry_run' => 'nullable',
        ]);

        $dryRun = filter_var($validated['dry_run'] ?? false, FILTER_VALIDATE_BOOLEAN);

        try {
            $query = ['team' => $validated['team']];
            if (!empty($validated['competition'])) {
                $query['competition'] = $validated['competition'];
            }

            $response = $this->dbcrewsClient()->get($this->dbcrewsBase() . '/results', $query);

            if ($response->failed()) {
                return response()->json(['error' => 'dbcrews returned status ' . $response->status()], 502);
            }

            $results = $response->json('results', []);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Could not reach dbcrews: ' . $e->getMessage()], 502);
        }

        $inserted = 0;   // in dry-run: how many WOULD be inserted
        $existing = 0;   // already in the DB (dedupe hit) — skipped
        $invalid = 0;    // missing essential fields — skipped
        $unmatched = []; // [membership_number => name] — no local member, skipped
        $preview = [];   // rows that would be inserted (dry-run report)

        // Cache members by membership_number to avoid repeated lookups.
        $membersByNumber = Member::whereNotNull('membership_number')
            ->get()
            ->keyBy('membership_number');

        foreach ($results as $row) {
            $memberId = $row['memberId'] ?? null;
            $eventName = trim($row['event'] ?? '');
            $competitionClass = trim($row['race'] ?? '');
            $medal = strtoupper(trim($row['medal'] ?? ''));
            $year = $row['year'] ?? null;

            // Skip records missing essentials.
            if ($memberId === null || $eventName === '' || $competitionClass === '' || $medal === '') {
                $invalid++;
                continue;
            }

            $member = $membersByNumber->get($memberId);

            if (!$member) {
                // No local member for this membership_number.
                $unmatched[$memberId] = $row['name'] ?? '';
                continue;
            }

            // Insert-only dedupe key: member + event + race + medal.
            $exists = Achievement::where('member_id', $member->id)
                ->where('event_name', $eventName)
                ->where('competition_class', $competitionClass)
                ->where('medal', $medal)
                ->exists();

            if ($exists) {
                $existing++;
                continue;
            }

            if ($dryRun) {
                // Preview only — do not write.
                $preview[] = [
                    'membership_number' => $memberId,
                    'name' => $member->name,
                    'event' => $eventName,
                    'race' => $competitionClass,
                    'medal' => $medal,
                    'year' => $year ? (int) $year : null,
                ];
            } else {
                Achievement::create([
                    'member_id' => $member->id,
                    'event_name' => $eventName,
                    'competition_class' => $competitionClass,
                    'medal' => $medal,
                    'year' => $year ? (int) $year : null,
                ]);
            }

            $inserted++;
        }

        // Shape unmatched for reporting: list of {membership_number, name}.
        $unmatchedList = [];
        foreach ($unmatched as $number => $name) {
            $unmatchedList[] = ['membership_number' => $number, 'name' => $name];
        }

        return response()->json([
            'dry_run' => $dryRun,
            'inserted' => $inserted, // would-insert count when dry_run
            'existing' => $existing, // already in DB (dedupe hit)
            'invalid' => $invalid,   // missing essential fields
            'skipped' => $existing + $invalid + count($unmatchedList), // combined, for convenience
            'unmatched' => $unmatchedList,
            'preview' => $preview, // populated only on dry_run
            'total' => count($results),
        ]);
    }

    /**
     * Delete all achievements for a given event (admin/superuser).
     * Useful for clearing a mis-named event before re-pulling from dbcrews.
     */
    public function deleteEvent(Request $request)
    {
        $validated = $request->validate(['event' => 'required|string']);

        $count = Achievement::where('event_name', $validated['event'])->delete();

        return redirect()->back()->with('success', "Deleted {$count} achievement(s) for \"{$validated['event']}\".");
    }

    /**
     * Show import page
     */
    public function showImport()
    {
        return Inertia::render('Achievements/Import');
    }

    /**
     * Import achievements from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        try {
            $file = $request->file('file');
            $csvData = array_map('str_getcsv', file($file->getRealPath()));

            // Skip header row (first row)
            array_shift($csvData);

            // Hardcoded column mapping:
            // Column A (0) = membership_number
            // Column B (1) = Competition class
            // Column C (2) = achievement (medal)
            // Column D (3) = Competition name (event name)
            $membershipCol = 0;
            $classCol = 1;
            $medalCol = 2;
            $eventCol = 3;

            $imported = 0;
            $skipped = 0;

            foreach ($csvData as $row) {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                $membershipNumber = trim($row[$membershipCol] ?? '');
                $competitionClass = trim($row[$classCol] ?? '');
                $medal = strtoupper(trim($row[$medalCol] ?? ''));
                $eventName = trim($row[$eventCol] ?? '');

                // Skip if essential data is missing
                if (empty($membershipNumber) || empty($competitionClass) || empty($medal) || empty($eventName)) {
                    $skipped++;
                    continue;
                }

                // Find member by membership number
                $member = Member::where('membership_number', $membershipNumber)->first();

                if (!$member) {
                    $skipped++;
                    continue;
                }

                // Extract year from event name (e.g., "National 2025" -> 2025)
                $year = null;
                if (preg_match('/\b(20\d{2})\b/', $eventName, $matches)) {
                    $year = (int)$matches[1];
                }

                // Create or update achievement
                Achievement::updateOrCreate(
                    [
                        'member_id' => $member->id,
                        'competition_class' => $competitionClass,
                        'event_name' => $eventName,
                    ],
                    [
                        'medal' => $medal,
                        'year' => $year,
                    ]
                );

                $imported++;
            }

            $message = "Successfully imported {$imported} achievement(s).";
            if ($skipped > 0) {
                $message .= " Skipped {$skipped} row(s) (missing data or member not found).";
            }

            return redirect()->back()->with('success', $message);

        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error importing file: ' . $e->getMessage());
        }
    }
}
