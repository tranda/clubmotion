<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Achievement;
use App\Models\Member;
use Inertia\Inertia;

class AchievementsController extends Controller
{
    /**
     * Display user's achievements
     */
    public function index()
    {
        $user = auth()->user();

        // Get user's member record
        $member = $user->member;

        if (!$member) {
            return Inertia::render('Achievements/Index', [
                'achievements' => [],
                'achievementsByEvent' => [],
            ]);
        }

        // Fetch achievements for this member, ordered by year (newest first) and event name
        $achievements = Achievement::where('member_id', $member->id)
            ->orderByDesc('year')
            ->orderBy('event_name')
            ->orderBy('competition_class')
            ->get();

        // Group achievements by event name
        $achievementsByEvent = $achievements->groupBy('event_name');

        return Inertia::render('Achievements/Index', [
            'achievements' => $achievements,
            'achievementsByEvent' => $achievementsByEvent,
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
