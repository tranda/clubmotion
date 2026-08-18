<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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
     * Export achievements for a specific event as a CSV pivot matrix.
     * Columns: ID (membership_number), Name, then one column per competition
     * class in the event. Each cell holds the member's medal (or is blank).
     */
    public function export(Request $request)
    {
        $eventName = trim((string) $request->query('event', ''));

        if ($eventName === '') {
            abort(404, 'Event not specified.');
        }

        // All achievements for this event, with their member records.
        $achievements = Achievement::where('event_name', $eventName)
            ->with('member')
            ->get();

        if ($achievements->isEmpty()) {
            abort(404, 'No achievements found for this event.');
        }

        // Race columns = distinct competition classes in the event.
        $classes = $achievements->pluck('competition_class')
            ->unique()
            ->sort()
            ->values();

        // Header row.
        $header = ['ID', 'Name'];
        foreach ($classes as $class) {
            $header[] = $class;
        }

        $csv = [$header];

        // One row per member, sorted by membership number.
        $rows = [];
        foreach ($achievements->groupBy('member_id') as $memberAchievements) {
            $member = $memberAchievements->first()->member;

            if (!$member) {
                continue;
            }

            $medalByClass = $memberAchievements->keyBy('competition_class');

            $row = [
                $member->membership_number,
                $member->name,
            ];

            foreach ($classes as $class) {
                $achievement = $medalByClass->get($class);
                $row[] = $achievement ? $achievement->medal : '';
            }

            $rows[] = [
                'sort' => (int) $member->membership_number,
                'row' => $row,
            ];
        }

        usort($rows, fn($a, $b) => $a['sort'] <=> $b['sort']);

        foreach ($rows as $r) {
            $csv[] = $r['row'];
        }

        // Build CSV string.
        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        // Safe filename from the event name.
        $safeName = preg_replace('/[^A-Za-z0-9 _-]+/', '', $eventName);
        $safeName = trim($safeName) !== '' ? trim($safeName) : 'achievements';

        return response($csvContent)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"{$safeName}.csv\"");
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
