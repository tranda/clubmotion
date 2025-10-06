<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\SessionType;
use App\Models\Member;
use App\Models\MembershipCategory;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * Display attendance grid
     */
    public function index(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $month = $request->input('month', date('m'));
        $sessionTypeFilter = $request->input('session_type_id', null);

        // Default to 'active' if filter is not present in query at all
        $filter = $request->has('filter') ? $request->query('filter') : 'active';

        // Get members based on filter (with category for stats)
        if ($filter === 'active') {
            $members = Member::with('category')
                ->where('is_active', 1)
                ->orderBy('membership_number')
                ->get();
        } else {
            // 'all' or any other value shows all members
            $members = Member::with('category')
                ->orderBy('membership_number')
                ->get();
        }

        // Get sessions for the selected month
        $sessionsQuery = AttendanceSession::with('sessionType')
            ->whereYear('date', $year)
            ->whereMonth('date', $month);

        if ($sessionTypeFilter) {
            $sessionsQuery->where('session_type_id', $sessionTypeFilter);
        }

        $sessions = $sessionsQuery->orderBy('date')->get();

        // Get all attendance records for the month
        $sessionIds = $sessions->pluck('id');
        $attendanceRecords = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->get()
            ->groupBy(function ($item) {
                return $item->member_id . '-' . $item->session_id;
            });

        // Build attendance grid data
        $attendanceGrid = [];
        foreach ($members as $member) {
            $memberData = [
                'id' => $member->id,
                'name' => $member->name,
                'membership_number' => $member->membership_number,
                'category_id' => $member->category_id,
                'category_name' => $member->category ? $member->category->name : null,
                'sessions' => [],
                'total' => 0,
            ];

            foreach ($sessions as $session) {
                $key = $member->id . '-' . $session->id;
                $record = $attendanceRecords->get($key)?->first();
                $isPresent = $record ? $record->present : false;

                $memberData['sessions'][] = [
                    'session_id' => $session->id,
                    'present' => $isPresent,
                ];

                if ($isPresent) {
                    $memberData['total']++;
                }
            }

            $attendanceGrid[] = $memberData;
        }

        // Calculate session totals (how many members attended each session)
        $sessionTotals = [];
        foreach ($sessions as $session) {
            $count = AttendanceRecord::where('session_id', $session->id)
                ->where('present', true)
                ->count();
            $sessionTotals[$session->id] = $count;
        }

        // Get all session types for filter dropdown
        $sessionTypes = SessionType::all();

        // Calculate statistics for the selected period
        $stats = $this->calculateStatistics($year, $month, $sessions, $attendanceGrid, $sessionTotals);

        // Calculate monthly attendance for current user (for personal trend chart)
        $userMonthlyData = [];
        $currentUser = $request->user();
        if ($currentUser && $currentUser->member) {
            $userMonthlyData = $this->calculateUserMonthlyAttendance($currentUser->member->id, $year);
        }

        return Inertia::render('Attendance/Index', [
            'attendanceGrid' => $attendanceGrid,
            'sessions' => $sessions,
            'sessionTotals' => $sessionTotals,
            'sessionTypes' => $sessionTypes,
            'year' => (int) $year,
            'month' => (int) $month,
            'sessionTypeFilter' => $sessionTypeFilter ? (int) $sessionTypeFilter : null,
            'filter' => $filter,
            'stats' => $stats,
            'userMonthlyData' => $userMonthlyData,
        ]);
    }

    /**
     * Create a new session
     */
    public function createSession(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'session_type_id' => 'required|exists:session_types,id',
            'notes' => 'nullable|string',
        ]);

        $session = AttendanceSession::create([
            'date' => $request->date,
            'session_type_id' => $request->session_type_id,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Session created successfully.');
    }

    /**
     * Mark attendance (single or batch)
     */
    public function markAttendance(Request $request)
    {
        $request->validate([
            'records' => 'required|array',
            'records.*.member_id' => 'required|exists:members,id',
            'records.*.session_id' => 'required|exists:attendance_sessions,id',
            'records.*.present' => 'required|boolean',
        ]);

        foreach ($request->records as $record) {
            AttendanceRecord::updateOrCreate(
                [
                    'member_id' => $record['member_id'],
                    'session_id' => $record['session_id'],
                ],
                [
                    'present' => $record['present'],
                ]
            );
        }

        return response()->json(['success' => true]);
    }

    /**
     * Update a session
     */
    public function updateSession(Request $request, $id)
    {
        $request->validate([
            'session_type_id' => 'required|exists:session_types,id',
            'notes' => 'nullable|string',
        ]);

        $session = AttendanceSession::findOrFail($id);
        $session->update([
            'session_type_id' => $request->session_type_id,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', 'Session updated successfully.');
    }

    /**
     * Delete a session
     */
    public function deleteSession($id)
    {
        $session = AttendanceSession::findOrFail($id);
        $session->delete();

        return redirect()->back()->with('success', 'Session deleted successfully.');
    }

    /**
     * Get session types
     */
    public function getSessionTypes()
    {
        return response()->json(SessionType::all());
    }

    /**
     * Show import form
     */
    public function showImport()
    {
        return Inertia::render('Attendance/Import');
    }

    /**
     * Import attendance from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'csv_files' => 'required|array',
            'csv_files.*' => 'required|file|mimes:csv,txt|max:5120', // 5MB max per file
        ]);

        $allErrors = [];
        $totalImported = 0;
        $totalSkipped = 0;
        $filesProcessed = 0;
        $firstImportedYear = null;
        $firstImportedMonth = null;

        // Get default Training session type (outside loop for efficiency)
        $trainingType = SessionType::where('name', 'Training')->first();
        if (!$trainingType) {
            return redirect()->back()->with('error', 'Training session type not found. Please run the seeder.');
        }

        foreach ($request->file('csv_files') as $file) {
            $filesProcessed++;
            $path = $file->getRealPath();
            $data = array_map('str_getcsv', file($path));

            if (count($data) < 3) {
                $allErrors[] = "File '{$file->getClientOriginalName()}': CSV file is empty or invalid.";
                continue;
            }

            // Skip first row (totals row)
            array_shift($data);

            $headers = array_shift($data); // Get actual header row
            $errors = [];
            $imported = 0;
            $skipped = 0;

            // Parse date columns (skip first two columns: name and membership number, and last column: totals)
            $dateColumns = [];
            $lastIndex = count($headers) - 1; // Index of last column (totals column)
            for ($i = 2; $i < $lastIndex; $i++) {
                $dateStr = trim($headers[$i]);

                // Parse date format YYYY-MM-DD (e.g., "2025-09-04")
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
                    try {
                        $date = Carbon::createFromFormat('Y-m-d', $dateStr);
                        $dateColumns[$i] = $date->format('Y-m-d');
                    } catch (\Exception $e) {
                        $errors[] = "Invalid date format in column: $dateStr";
                    }
                }
            }

            if (empty($dateColumns)) {
                $allErrors[] = "File '{$file->getClientOriginalName()}': No valid date columns found. Expected format: YYYY-MM-DD";
                continue;
            }

            // Process each row
            foreach ($data as $rowIndex => $row) {
                $lineNumber = $rowIndex + 2; // +2 because we removed header and arrays are 0-indexed

                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Get membership number (second column)
                $membershipNumber = isset($row[1]) ? trim($row[1]) : null;

                if (empty($membershipNumber)) {
                    $errors[] = "Line $lineNumber: Missing membership number";
                    $skipped++;
                    continue;
                }

                // Find member by membership number
                $member = Member::where('membership_number', $membershipNumber)->first();

                if (!$member) {
                    $errors[] = "Line $lineNumber: Member with number $membershipNumber not found";
                    $skipped++;
                    continue;
                }

                // Process each date column
                foreach ($dateColumns as $colIndex => $date) {
                    $attendance = isset($row[$colIndex]) ? strtoupper(trim($row[$colIndex])) : 'FALSE';

                    $isPresent = ($attendance === 'TRUE' || $attendance === '1');

                    // Get session for this date (ignore session type to avoid duplicates)
                    $session = AttendanceSession::where('date', $date)->first();

                    // If no session exists for this date, create one with Training type
                    if (!$session) {
                        $session = AttendanceSession::create([
                            'date' => $date,
                            'session_type_id' => $trainingType->id,
                        ]);
                    }

                    // Track first imported date for redirect
                    if (!$firstImportedYear) {
                        $firstImportedYear = Carbon::parse($date)->year;
                        $firstImportedMonth = Carbon::parse($date)->month;
                    }

                    // Create or update attendance record
                    AttendanceRecord::updateOrCreate(
                        [
                            'member_id' => $member->id,
                            'session_id' => $session->id,
                        ],
                        [
                            'present' => $isPresent,
                        ]
                    );

                    $imported++;
                }
            }

            $totalImported += $imported;
            $totalSkipped += $skipped;

            // Add file-specific errors with filename prefix
            foreach ($errors as $error) {
                $allErrors[] = "File '{$file->getClientOriginalName()}': {$error}";
            }
        }

        $message = "Import completed: {$filesProcessed} file(s) processed, {$totalImported} records imported";
        if ($totalSkipped > 0) {
            $message .= ", {$totalSkipped} rows skipped";
        }

        // Redirect to the first imported year/month if available, otherwise current year
        $redirectYear = $firstImportedYear ?? date('Y');
        $redirectMonth = $firstImportedMonth ?? date('m');

        return redirect()
            ->route('attendance.index', ['year' => $redirectYear, 'month' => $redirectMonth])
            ->with('success', $message)
            ->with('import_errors', $allErrors);
    }

    /**
     * Calculate attendance statistics
     */
    private function calculateStatistics($year, $month, $sessions, $attendanceGrid, $sessionTotals)
    {
        $totalSessions = count($sessions);
        $totalMembers = count($attendanceGrid);

        // Calculate total attendance records
        $totalAttendance = 0;
        $possibleAttendance = $totalSessions * $totalMembers;

        foreach ($attendanceGrid as $member) {
            $totalAttendance += $member['total'];
        }

        // Overall attendance rate
        $attendanceRate = $possibleAttendance > 0 ? round(($totalAttendance / $possibleAttendance) * 100, 1) : 0;

        // Top attendees (sorted by total attendance)
        $topAttendees = collect($attendanceGrid)
            ->sortByDesc('total')
            ->take(5)
            ->map(function ($member) use ($totalSessions) {
                $rate = $totalSessions > 0 ? round(($member['total'] / $totalSessions) * 100, 1) : 0;
                return [
                    'name' => $member['name'],
                    'total' => $member['total'],
                    'rate' => $rate
                ];
            })
            ->values()
            ->toArray();

        // Session type breakdown
        $sessionTypeStats = [];
        foreach ($sessions as $session) {
            $typeId = $session->session_type_id;
            if (!isset($sessionTypeStats[$typeId])) {
                $sessionTypeStats[$typeId] = [
                    'type_id' => $typeId,
                    'type_name' => $session->sessionType->name,
                    'count' => 0,
                    'total_attendance' => 0,
                    'color' => $session->sessionType->color,
                ];
            }
            $sessionTypeStats[$typeId]['count']++;
            $sessionTypeStats[$typeId]['total_attendance'] += $sessionTotals[$session->id] ?? 0;
        }

        // Calculate average attendance per session type
        foreach ($sessionTypeStats as &$stat) {
            $stat['avg_attendance'] = $stat['count'] > 0 ? round($stat['total_attendance'] / $stat['count'], 1) : 0;
        }

        // Most attended session
        $mostAttendedSession = null;
        $maxAttendance = 0;
        foreach ($sessions as $session) {
            if (($sessionTotals[$session->id] ?? 0) > $maxAttendance) {
                $maxAttendance = $sessionTotals[$session->id] ?? 0;
                $mostAttendedSession = [
                    'date' => $session->date,
                    'attendance' => $maxAttendance,
                    'type' => $session->sessionType->name,
                ];
            }
        }

        // Previous month comparison
        $prevMonth = $month - 1;
        $prevYear = $year;
        if ($prevMonth < 1) {
            $prevMonth = 12;
            $prevYear = $year - 1;
        }

        $prevMonthSessions = AttendanceSession::whereYear('date', $prevYear)
            ->whereMonth('date', $prevMonth)
            ->get();

        $prevMonthAttendance = 0;
        foreach ($prevMonthSessions as $session) {
            $prevMonthAttendance += AttendanceRecord::where('session_id', $session->id)
                ->where('present', true)
                ->count();
        }

        $prevMonthTotal = count($prevMonthSessions) * $totalMembers;
        $prevMonthRate = $prevMonthTotal > 0 ? round(($prevMonthAttendance / $prevMonthTotal) * 100, 1) : 0;

        // Monthly attendance for the whole year (for bar chart)
        $monthlyData = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthSessions = AttendanceSession::whereYear('date', $year)
                ->whereMonth('date', $m)
                ->get();

            $monthAttendance = 0;
            foreach ($monthSessions as $session) {
                $monthAttendance += AttendanceRecord::where('session_id', $session->id)
                    ->where('present', true)
                    ->count();
            }

            $monthlyData[] = [
                'month' => $m,
                'month_name' => date('M', mktime(0, 0, 0, $m, 1)),
                'attendance' => $monthAttendance,
                'sessions' => count($monthSessions),
            ];
        }

        // Category distribution - use categories from fetched members
        $allCategories = MembershipCategory::all();
        $categoryStats = [];

        // Initialize all categories with count 0
        foreach ($allCategories as $category) {
            $categoryStats[$category->id] = [
                'name' => $category->name,
                'count' => 0,
            ];
        }

        // Count members by category from attendance grid
        foreach ($attendanceGrid as $member) {
            if ($member['category_id'] && isset($categoryStats[$member['category_id']])) {
                $categoryStats[$member['category_id']]['count']++;
            }
        }

        // Convert to array and sort by category name alphabetically
        $categoryStats = array_values($categoryStats);
        usort($categoryStats, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        return [
            'total_sessions' => $totalSessions,
            'total_members' => $totalMembers,
            'total_attendance' => $totalAttendance,
            'attendance_rate' => $attendanceRate,
            'top_attendees' => $topAttendees,
            'session_type_stats' => array_values($sessionTypeStats),
            'most_attended_session' => $mostAttendedSession,
            'prev_month_rate' => $prevMonthRate,
            'rate_change' => round($attendanceRate - $prevMonthRate, 1),
            'monthly_data' => $monthlyData,
            'category_stats' => $categoryStats,
        ];
    }

    /**
     * Calculate monthly attendance for a specific user
     */
    private function calculateUserMonthlyAttendance($memberId, $year)
    {
        $monthlyData = [];

        for ($month = 1; $month <= 12; $month++) {
            // Get sessions for this month
            $sessions = AttendanceSession::whereYear('date', $year)
                ->whereMonth('date', $month)
                ->pluck('id');

            // Count user's attendance for this month (only present = true)
            $attendance = AttendanceRecord::whereIn('session_id', $sessions)
                ->where('member_id', $memberId)
                ->where('present', true)
                ->count();

            $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            $monthlyData[] = [
                'month' => $month,
                'month_name' => $monthNames[$month - 1],
                'attendance' => $attendance,
                'sessions' => $sessions->count(),
            ];
        }

        return $monthlyData;
    }
}
