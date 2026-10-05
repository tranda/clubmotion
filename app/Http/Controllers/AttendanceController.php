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
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

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

        // Calculate yearly attendance trend (all years with attendance > 0)
        $yearlyData = $this->calculateYearlyAttendance();

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
            'yearlyData' => $yearlyData,
        ]);
    }

    /**
     * Export attendance for a date range as CSV, XLSX or PDF
     */
    public function export(Request $request)
    {
        $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'format' => 'required|in:csv,xlsx,pdf',
            'session_type_id' => 'nullable|exists:session_types,id',
            'filter' => 'nullable|in:active,all',
        ]);

        $data = $this->assembleExport(
            $request->input('from'),
            $request->input('to'),
            $request->input('session_type_id'),
            $request->input('filter', 'active')
        );

        $filename = sprintf('attendance_%s_%s.%s', $data['from'], $data['to'], $request->input('format'));

        switch ($request->input('format')) {
            case 'csv':
                return $this->exportCsv($data, $filename);
            case 'xlsx':
                return $this->exportXlsx($data, $filename);
            default:
                return Pdf::loadView('reports.attendance', $data)
                    ->setPaper('a4', 'landscape')
                    ->download($filename);
        }
    }

    /**
     * Build the member x session matrix for an export period
     */
    private function assembleExport($from, $to, $sessionTypeId, $filter)
    {
        $from = Carbon::parse($from)->toDateString();
        $to = Carbon::parse($to)->toDateString();

        $sessionsQuery = AttendanceSession::with('sessionType')
            ->whereBetween('date', [$from, $to]);
        if ($sessionTypeId) {
            $sessionsQuery->where('session_type_id', $sessionTypeId);
        }
        $sessions = $sessionsQuery->orderBy('date')->orderBy('id')->get();

        // Members of the club during the period: registered by its end and not
        // deactivated before its start.
        $membersQuery = Member::with('category')
            ->where(function ($q) use ($to) {
                $q->whereNull('registration_date')->orWhere('registration_date', '<=', $to);
            })
            ->where(function ($q) use ($from) {
                $q->whereNull('deactivation_date')->orWhere('deactivation_date', '>=', $from);
            });
        if ($filter === 'active') {
            $membersQuery->where('is_active', true);
        }
        $members = $membersQuery->orderBy('membership_number')->get();

        $present = AttendanceRecord::whereIn('session_id', $sessions->pluck('id'))
            ->where('present', true)
            ->get(['member_id', 'session_id'])
            ->map(fn ($r) => $r->member_id . '-' . $r->session_id)
            ->flip();

        $sessionCount = $sessions->count();
        $sessionTotals = array_fill_keys($sessions->pluck('id')->all(), 0);

        $rows = [];
        foreach ($members as $member) {
            $marks = [];
            $total = 0;
            foreach ($sessions as $session) {
                $isPresent = isset($present[$member->id . '-' . $session->id]);
                $marks[] = $isPresent;
                if ($isPresent) {
                    $total++;
                    $sessionTotals[$session->id]++;
                }
            }

            $rows[] = [
                'number' => $member->membership_number,
                'name' => $member->name,
                'category' => $member->category->category_name ?? '',
                'marks' => $marks,
                'total' => $total,
                'percent' => $sessionCount ? round($total / $sessionCount * 100) : 0,
            ];
        }

        $sessionType = $sessionTypeId ? SessionType::find($sessionTypeId) : null;

        return [
            'from' => $from,
            'to' => $to,
            'sessionTypeName' => $sessionType->name ?? null,
            'filter' => $filter,
            'sessions' => $sessions->map(fn ($s) => [
                'date' => $s->date->format('d.m.Y'),
                'type' => $s->sessionType->name ?? '',
            ])->all(),
            'sessionTotals' => array_values($sessionTotals),
            'rows' => $rows,
        ];
    }

    private function exportHeader(array $data)
    {
        $header = ['#', 'Name', 'Category'];
        foreach ($data['sessions'] as $session) {
            $header[] = trim($session['date'] . ' ' . $session['type']);
        }
        return array_merge($header, ['Total', '%']);
    }

    private function exportCsv(array $data, $filename)
    {
        return response()->streamDownload(function () use ($data) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel shows č/ć/š/ž/đ correctly; ';' is Excel's
            // list separator in Serbian locale.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $this->exportHeader($data), ';');
            foreach ($data['rows'] as $row) {
                fputcsv($out, array_merge(
                    [$row['number'], $row['name'], $row['category']],
                    array_map(fn ($p) => $p ? '1' : '', $row['marks']),
                    [$row['total'], $row['percent']]
                ), ';');
            }
            fputcsv($out, array_merge(['', 'Total', ''], $data['sessionTotals'], ['', '']), ';');
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function exportXlsx(array $data, $filename)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Attendance');

        $sheet->setCellValue('A1', "Attendance {$data['from']} – {$data['to']}"
            . ($data['sessionTypeName'] ? " ({$data['sessionTypeName']})" : ''));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);

        $header = $this->exportHeader($data);
        $sheet->fromArray($header, null, 'A3');
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($header));
        $sheet->getStyle("A3:{$lastCol}3")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']],
            'alignment' => ['textRotation' => 90, 'horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        // Keep #, Name, Category, Total and % headers horizontal.
        foreach (['A3', 'B3', 'C3', $lastCol . '3'] as $cell) {
            $sheet->getStyle($cell)->getAlignment()->setTextRotation(0);
        }
        $totalCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($header) - 1);
        $sheet->getStyle($totalCol . '3')->getAlignment()->setTextRotation(0);

        $r = 4;
        foreach ($data['rows'] as $row) {
            $sheet->fromArray(array_merge(
                [$row['number'], $row['name'], $row['category']],
                array_map(fn ($p) => $p ? '✓' : '', $row['marks']),
                [$row['total'], $row['percent'] / 100]
            ), null, "A{$r}");
            $r++;
        }
        $sheet->fromArray(array_merge(['', 'Total', ''], $data['sessionTotals']), null, "A{$r}");
        $sheet->getStyle("A{$r}:{$lastCol}{$r}")->getFont()->setBold(true);

        $sheet->getStyle("D4:{$lastCol}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("{$lastCol}4:{$lastCol}{$r}")->getNumberFormat()->setFormatCode('0%');
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setAutoSize(true);
        $sheet->getColumnDimension('C')->setAutoSize(true);
        $sheet->freezePane('D4');

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
     * Yearly attendance grid: each active member's session count per
     * month (rows × 12 month columns + year total). Optional filter by
     * session type.
     */
    public function yearly(Request $request)
    {
        $year = (int) $request->input('year', date('Y'));
        $sessionTypeFilter = $request->input('session_type_id') ?: null;
        $filter = $request->has('filter') ? $request->query('filter') : 'active';

        $membersQuery = Member::with('category');
        if ($filter === 'active') {
            $membersQuery->where('is_active', 1);
        }
        $members = $membersQuery->orderBy('membership_number')->get();

        $sessionsQuery = AttendanceSession::whereYear('date', $year);
        if ($sessionTypeFilter) {
            $sessionsQuery->where('session_type_id', $sessionTypeFilter);
        }
        $sessions = $sessionsQuery->get(['id', 'date']);

        // Map session_id => month-of-year (1..12)
        $sessionMonths = [];
        foreach ($sessions as $s) {
            $sessionMonths[$s->id] = (int) $s->date->format('n');
        }

        $sessionsPerMonth = array_fill(1, 12, 0);
        foreach ($sessionMonths as $m) {
            $sessionsPerMonth[$m] = ($sessionsPerMonth[$m] ?? 0) + 1;
        }
        $sessionsTotalYear = array_sum($sessionsPerMonth);

        $records = !empty($sessionMonths)
            ? AttendanceRecord::whereIn('session_id', array_keys($sessionMonths))
                ->where('present', true)
                ->get(['member_id', 'session_id'])
            : collect();

        $counts = [];
        foreach ($records as $r) {
            $month = $sessionMonths[$r->session_id] ?? null;
            if (!$month) continue;
            if (!isset($counts[$r->member_id])) {
                $counts[$r->member_id] = array_fill(1, 12, 0);
            }
            $counts[$r->member_id][$month]++;
        }

        $rows = $members->map(function ($member) use ($counts) {
            $perMonth = $counts[$member->id] ?? array_fill(1, 12, 0);
            $total = array_sum($perMonth);
            return [
                'id' => $member->id,
                'name' => $member->name,
                'membership_number' => $member->membership_number,
                'category' => $member->category->name ?? '',
                'months' => $perMonth,
                'total' => $total,
            ];
        });

        $availableYears = AttendanceSession::query()
            ->selectRaw('DISTINCT YEAR(date) as y')
            ->orderBy('y', 'desc')
            ->pluck('y')
            ->map(fn ($v) => (int) $v)
            ->toArray();
        if (empty($availableYears)) {
            $availableYears = [(int) date('Y')];
        }

        return Inertia::render('Attendance/Yearly', [
            'year' => $year,
            'rows' => $rows,
            'sessionsPerMonth' => $sessionsPerMonth,
            'sessionsTotalYear' => $sessionsTotalYear,
            'availableYears' => $availableYears,
            'sessionTypes' => SessionType::orderBy('name')->get(['id', 'name']),
            'sessionTypeFilter' => $sessionTypeFilter,
            'filter' => $filter,
        ]);
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
        \Log::info('Attendance import started');

        $request->validate([
            'csv_files' => 'required|array',
            'csv_files.*' => 'required|file|mimes:csv,txt|max:5120', // 5MB max per file
        ]);

        \Log::info('Validation passed, files count: ' . count($request->file('csv_files')));

        $allErrors = [];
        $totalImported = 0;
        $totalSkipped = 0;
        $filesProcessed = 0;
        $firstImportedYear = null;
        $firstImportedMonth = null;

        // Get default Training session type (outside loop for efficiency)
        $trainingType = SessionType::where('name', 'Training')->first();
        if (!$trainingType) {
            \Log::error('Training session type not found');
            return redirect()->back()->with('error', 'Training session type not found. Please run the seeder.');
        }

        foreach ($request->file('csv_files') as $file) {
            $filesProcessed++;
            \Log::info("Processing file: {$file->getClientOriginalName()}");
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
                \Log::warning("No valid date columns in file: {$file->getClientOriginalName()}");
                continue;
            }

            \Log::info("Found " . count($dateColumns) . " date columns in file: {$file->getClientOriginalName()}");

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

        \Log::info("Import completed. Total records: {$totalImported}, Redirecting to year: {$redirectYear}, month: {$redirectMonth}");

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

        // Top attendees (sorted by total attendance) - top 5 for preview
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

        // All attendees ranked (complete list for full ranking view)
        $allAttendeesRanked = collect($attendanceGrid)
            ->sortByDesc('total')
            ->values()
            ->map(function ($member, $index) use ($totalSessions) {
                $rate = $totalSessions > 0 ? round(($member['total'] / $totalSessions) * 100, 1) : 0;
                return [
                    'rank' => $index + 1,
                    'name' => $member['name'],
                    'total' => $member['total'],
                    'rate' => $rate
                ];
            })
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
            'all_attendees_ranked' => $allAttendeesRanked,
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

    /**
     * Calculate yearly attendance trend (all years with attendance > 0)
     */
    private function calculateYearlyAttendance()
    {
        // Get all distinct years that have sessions
        $years = AttendanceSession::selectRaw('YEAR(date) as year')
            ->distinct()
            ->orderBy('year', 'asc')
            ->pluck('year');

        $yearlyData = [];

        foreach ($years as $year) {
            // Get all sessions for this year
            $sessionIds = AttendanceSession::whereYear('date', $year)->pluck('id');

            // Count total attendance for this year (only present = true)
            $totalAttendance = AttendanceRecord::whereIn('session_id', $sessionIds)
                ->where('present', true)
                ->count();

            // Only include years with attendance > 0
            if ($totalAttendance > 0) {
                $yearlyData[] = [
                    'year' => (int) $year,
                    'attendance' => $totalAttendance,
                    'sessions' => $sessionIds->count(),
                ];
            }
        }

        return $yearlyData;
    }
}
