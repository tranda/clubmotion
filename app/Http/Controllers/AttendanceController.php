<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\SessionType;
use App\Models\Member;
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

        // Get all active members
        $members = Member::where('is_active', 1)
            ->orderBy('membership_number')
            ->get(['id', 'name', 'membership_number']);

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

        return Inertia::render('Attendance/Index', [
            'attendanceGrid' => $attendanceGrid,
            'sessions' => $sessions,
            'sessionTotals' => $sessionTotals,
            'sessionTypes' => $sessionTypes,
            'year' => (int) $year,
            'month' => (int) $month,
            'sessionTypeFilter' => $sessionTypeFilter ? (int) $sessionTypeFilter : null,
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
            'csv_file' => 'required|file|mimes:csv,txt|max:5120', // 5MB max
        ]);

        $file = $request->file('csv_file');
        $path = $file->getRealPath();
        $data = array_map('str_getcsv', file($path));

        if (count($data) < 2) {
            return redirect()->back()->with('error', 'CSV file is empty or invalid.');
        }

        $headers = array_shift($data); // Remove header row
        $errors = [];
        $imported = 0;
        $skipped = 0;

        // Get default Training session type
        $trainingType = SessionType::where('name', 'Training')->first();
        if (!$trainingType) {
            return redirect()->back()->with('error', 'Training session type not found. Please run the seeder.');
        }

        // Parse date columns (skip first two columns: name and membership number)
        $dateColumns = [];
        for ($i = 2; $i < count($headers); $i++) {
            $dateStr = trim($headers[$i]);

            // Parse date format like "4-Sep", "5-Sep", etc.
            if (preg_match('/^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i', $dateStr, $matches)) {
                $day = $matches[1];
                $month = $matches[2];

                // Convert month name to number
                $monthNum = date('m', strtotime($month));

                // Use current year (you can make this configurable)
                $year = date('Y');

                try {
                    $date = Carbon::createFromFormat('Y-m-d', "$year-$monthNum-$day");
                    $dateColumns[$i] = $date->format('Y-m-d');
                } catch (\Exception $e) {
                    $errors[] = "Invalid date format in column: $dateStr";
                }
            }
        }

        if (empty($dateColumns)) {
            return redirect()->back()->with('error', 'No valid date columns found. Expected format: DD-MMM (e.g., 4-Sep)');
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

                // Create or get session for this date
                $session = AttendanceSession::firstOrCreate(
                    [
                        'date' => $date,
                        'session_type_id' => $trainingType->id,
                    ]
                );

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

        $message = "Import completed: $imported records imported";
        if ($skipped > 0) {
            $message .= ", $skipped rows skipped";
        }

        return redirect()
            ->route('attendance.index')
            ->with('success', $message)
            ->with('import_errors', $errors);
    }
}
