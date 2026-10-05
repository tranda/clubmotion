<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Achievement;
use App\Models\Member;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AchievementsController extends Controller
{
    private const MEDAL_ORDER = ['GOLD' => 1, 'SILVER' => 2, 'BRONZE' => 3];

    /**
     * Export club achievements for a year range as CSV, XLSX or PDF
     */
    public function export(Request $request)
    {
        $request->validate([
            'from' => 'required|integer|min:1900|max:2100',
            'to' => 'required|integer|min:1900|max:2100|gte:from',
            'format' => 'required|in:csv,xlsx,pdf',
        ]);

        $data = $this->assembleExport((int) $request->input('from'), (int) $request->input('to'));
        $filename = sprintf('achievements_%d_%d.%s', $data['from'], $data['to'], $request->input('format'));

        switch ($request->input('format')) {
            case 'csv':
                return $this->exportCsv($data, $filename);
            case 'xlsx':
                return $this->exportXlsx($data, $filename);
            default:
                return Pdf::loadView('reports.achievements', $data)
                    ->setPaper('a4', 'portrait')
                    ->download($filename);
        }
    }

    /**
     * Club achievements in the range: one row per unique result (year, event,
     * class, medal) with all members who earned it, plus per-year and
     * per-member medal counts.
     */
    private function assembleExport(int $from, int $to)
    {
        $achievements = Achievement::with('member:id,name,membership_number')
            ->whereBetween('year', [$from, $to])
            ->get();

        $medalRank = fn ($medal) => self::MEDAL_ORDER[strtoupper($medal)] ?? 9;

        $results = $achievements
            ->groupBy(fn ($a) => $a->year . '|' . $a->event_name . '|' . $a->competition_class . '|' . $a->medal)
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'year' => (int) $first->year,
                    'event' => $first->event_name,
                    'class' => $first->competition_class,
                    'medal' => strtoupper($first->medal),
                    'members' => $group->map(fn ($a) => $a->member->name ?? '?')->unique()->sort()->implode(', '),
                ];
            })
            ->sort(function ($a, $b) use ($medalRank) {
                return [$b['year'], $a['event'], $medalRank($a['medal']), $a['class']]
                    <=> [$a['year'], $b['event'], $medalRank($b['medal']), $b['class']];
            })
            ->values()
            ->all();

        $blank = ['GOLD' => 0, 'SILVER' => 0, 'BRONZE' => 0, 'OTHER' => 0, 'TOTAL' => 0];
        $medalKey = fn ($medal) => isset(self::MEDAL_ORDER[$medal]) ? $medal : 'OTHER';

        // Per year: count unique results (a crew medal counts once)
        $byYear = [];
        foreach ($results as $r) {
            $byYear[$r['year']] = $byYear[$r['year']] ?? $blank;
            $byYear[$r['year']][$medalKey($r['medal'])]++;
            $byYear[$r['year']]['TOTAL']++;
        }
        krsort($byYear);

        // Per member: every medal the member earned
        $byMember = [];
        foreach ($achievements as $a) {
            if (!$a->member) {
                continue;
            }
            $id = $a->member->id;
            $byMember[$id] = $byMember[$id] ?? ['name' => $a->member->name] + $blank;
            $byMember[$id][$medalKey(strtoupper($a->medal))]++;
            $byMember[$id]['TOTAL']++;
        }
        usort($byMember, fn ($a, $b) => [$b['GOLD'], $b['SILVER'], $b['BRONZE'], $b['TOTAL'], $a['name']]
            <=> [$a['GOLD'], $a['SILVER'], $a['BRONZE'], $a['TOTAL'], $b['name']]);

        return [
            'from' => $from,
            'to' => $to,
            'results' => $results,
            'byYear' => $byYear,
            'byMember' => $byMember,
            'hasOther' => collect($byYear)->sum('OTHER') > 0,
        ];
    }

    private function exportCsv(array $data, $filename)
    {
        return response()->streamDownload(function () use ($data) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM + ';' separator so Excel (Serbian locale) opens it cleanly.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Year', 'Event', 'Class', 'Medal', 'Members'], ';');
            foreach ($data['results'] as $r) {
                fputcsv($out, [$r['year'], $r['event'], $r['class'], $r['medal'], $r['members']], ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function exportXlsx(array $data, $filename)
    {
        $spreadsheet = new Spreadsheet();
        $medalCols = $data['hasOther'] ? ['GOLD', 'SILVER', 'BRONZE', 'OTHER', 'TOTAL'] : ['GOLD', 'SILVER', 'BRONZE', 'TOTAL'];
        $medalHeaders = array_map(fn ($m) => ucfirst(strtolower($m)), $medalCols);

        // Sheet 1: results
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Achievements');
        $sheet->fromArray(['Year', 'Event', 'Class', 'Medal', 'Members'], null, 'A1');
        $r = 2;
        foreach ($data['results'] as $row) {
            $sheet->fromArray([$row['year'], $row['event'], $row['class'], $row['medal'], $row['members']], null, "A{$r}", true);
            $fill = ['GOLD' => 'FEF3C7', 'SILVER' => 'F3F4F6', 'BRONZE' => 'FFEDD5'][$row['medal']] ?? null;
            if ($fill) {
                $sheet->getStyle("D{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($fill);
            }
            $r++;
        }
        $this->headerStyle($sheet, 'A1:E1');
        foreach (['A', 'B', 'C', 'D'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getColumnDimension('E')->setWidth(60);
        $sheet->getStyle("E2:E{$r}")->getAlignment()->setWrapText(true);
        $sheet->freezePane('A2');

        // Sheet 2: medals by year
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('By year');
        $sheet->fromArray(array_merge(['Year'], $medalHeaders), null, 'A1');
        $r = 2;
        foreach ($data['byYear'] as $year => $counts) {
            $sheet->fromArray(array_merge([$year], array_map(fn ($m) => $counts[$m], $medalCols)), null, "A{$r}", true);
            $r++;
        }
        $this->headerStyle($sheet, 'A1:' . chr(ord('A') + count($medalCols)) . '1');

        // Sheet 3: medals by member
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('By member');
        $sheet->fromArray(array_merge(['Member'], $medalHeaders), null, 'A1');
        $r = 2;
        foreach ($data['byMember'] as $counts) {
            $sheet->fromArray(array_merge([$counts['name']], array_map(fn ($m) => $counts[$m], $medalCols)), null, "A{$r}", true);
            $r++;
        }
        $this->headerStyle($sheet, 'A1:' . chr(ord('A') + count($medalCols)) . '1');
        $sheet->getColumnDimension('A')->setAutoSize(true);

        $spreadsheet->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function headerStyle($sheet, string $range)
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']],
        ]);
    }

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

        $achievementYears = Achievement::whereNotNull('year')
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(fn ($y) => (int) $y)
            ->values();

        return Inertia::render('Achievements/Index', [
            'achievementYears' => $achievementYears,
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
     * Turn a failed dbcrews HTTP response into a JSON error response,
     * with a clear message for auth failures.
     */
    private function dbcrewsFailure($response)
    {
        if ($response->status() === 401) {
            return response()->json([
                'error' => 'dbcrews API key missing or invalid. Set DBCREWS_API_KEY in the server .env.',
            ], 401);
        }

        return response()->json(['error' => 'dbcrews returned status ' . $response->status()], 502);
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
                return $this->dbcrewsFailure($response);
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
                return $this->dbcrewsFailure($response);
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
                return $this->dbcrewsFailure($response);
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
            // Stable competition id (rename-proof). Null when the feed doesn't send it.
            $competitionId = isset($row['competitionId']) && $row['competitionId'] !== ''
                ? (int) $row['competitionId']
                : null;

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

            // Insert-only dedupe. Prefer the stable competition id (immune to event
            // renames); fall back to event_name when the feed has no competition id.
            $dedupe = Achievement::where('member_id', $member->id)
                ->where('competition_class', $competitionClass)
                ->where('medal', $medal);

            if ($competitionId !== null) {
                $dedupe->where('dbcrews_competition_id', $competitionId);
            } else {
                $dedupe->where('event_name', $eventName)
                    ->whereNull('dbcrews_competition_id');
            }

            if ($dedupe->exists()) {
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
                    'dbcrews_competition_id' => $competitionId,
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
