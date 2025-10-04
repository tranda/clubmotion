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
}
