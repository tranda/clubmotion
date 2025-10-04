<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\MembershipPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /**
     * Display payment grid for admin/superuser or redirect users to their payments
     */
    public function index(Request $request)
    {
        $year = $request->input('year', date('Y'));
        // Only default to 'active' if filter is not present in query at all
        $filter = $request->has('filter') ? $request->input('filter') : 'active';
        $user = auth()->user();

        // Regular users see only their own payments
        if ($user->role_id == 3) {
            return redirect('/my-payments');
        }

        // Get members with their payments for the year
        $membersQuery = Member::with(['category', 'payments' => function($query) use ($year) {
            $query->where('payment_year', $year);
        }]);

        if ($filter === 'active') {
            $membersQuery->where('is_active', true);
        }
        // 'all' or any other value shows all members

        $members = $membersQuery->orderBy('membership_number')->get();

        // Calculate stats
        $stats = MembershipPayment::where('payment_year', $year)
            ->selectRaw('
                COUNT(*) as total_records,
                SUM(CASE WHEN payment_status = "paid" THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN payment_status = "pending" THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN payment_status = "overdue" THEN 1 ELSE 0 END) as overdue_count,
                SUM(CASE WHEN payment_status = "exempt" THEN 1 ELSE 0 END) as exempt_count,
                SUM(CASE WHEN payment_status = "paid" THEN paid_amount ELSE 0 END) as total_collected
            ')
            ->first();

        // Transform data for grid display
        $gridData = $members->map(function ($member) use ($year) {
            $payments = $member->payments->keyBy('payment_month');

            $months = [];
            for ($month = 1; $month <= 12; $month++) {
                $payment = $payments->get($month);
                $months[$month] = $payment ? [
                    'id' => $payment->id,
                    'status' => $payment->payment_status,
                    'amount' => $payment->paid_amount,
                    'expected' => $payment->expected_amount,
                    'exemption' => $payment->exemption_reason,
                    'date' => $payment->payment_date?->format('d.m.Y'),
                    'method' => $payment->payment_method,
                ] : null;
            }

            return [
                'id' => $member->id,
                'name' => $member->name,
                'membership_number' => $member->membership_number,
                'exemption_status' => $member->exemption_status,
                'category' => $member->category->name ?? '',
                'months' => $months,
            ];
        });

        // Get available years from actual payment data
        $yearsInDb = MembershipPayment::select('payment_year')
            ->distinct()
            ->orderBy('payment_year', 'desc')
            ->pluck('payment_year')
            ->toArray();

        // If no data, default to current year and next year
        $availableYears = !empty($yearsInDb) ? $yearsInDb : [date('Y') + 1, date('Y')];

        return Inertia::render('Payments/Index', [
            'year' => (int)$year,
            'members' => $gridData,
            'stats' => $stats,
            'availableYears' => $availableYears,
            'filter' => $filter,
        ]);
    }

    /**
     * Show payment history for current user
     */
    public function myPayments(Request $request)
    {
        $user = auth()->user();

        if (!$user->member) {
            abort(404, 'Member profile not found');
        }

        $year = $request->input('year', date('Y'));

        $payments = $user->member->paymentsForYear($year)
            ->orderBy('payment_month')
            ->get();

        // Get available years from member's payment data
        $yearsInDb = MembershipPayment::where('member_id', $user->member->id)
            ->select('payment_year')
            ->distinct()
            ->orderBy('payment_year', 'desc')
            ->pluck('payment_year')
            ->toArray();

        return Inertia::render('Payments/MyPayments', [
            'member' => $user->member,
            'year' => (int)$year,
            'payments' => $payments,
            'availableYears' => !empty($yearsInDb) ? $yearsInDb : [date('Y')],
        ]);
    }

    /**
     * Initialize payment records for a year
     */
    public function showInitialize(Request $request)
    {
        $year = $request->input('year', date('Y') + 1);

        return Inertia::render('Payments/InitializeYear', [
            'year' => (int)$year,
            'memberCount' => Member::where('is_active', true)->count(),
        ]);
    }

    /**
     * Store initialized payment records
     */
    public function initialize(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2024|max:2030',
            'monthly_rates' => 'required|array',
            'monthly_rates.*' => 'nullable|numeric|min:0',
        ]);

        $year = $request->year;
        $rates = $request->monthly_rates;

        $members = Member::where('is_active', true)->get();
        $createdCount = 0;

        DB::beginTransaction();
        try {
            foreach ($members as $member) {
                for ($month = 1; $month <= 12; $month++) {
                    $expectedAmount = $rates[$month] ?? 0;

                    // Check if already exists
                    $existing = MembershipPayment::where('member_id', $member->id)
                        ->where('payment_year', $year)
                        ->where('payment_month', $month)
                        ->exists();

                    if (!$existing) {
                        MembershipPayment::create([
                            'member_id' => $member->id,
                            'payment_year' => $year,
                            'payment_month' => $month,
                            'expected_amount' => $expectedAmount,
                            'payment_status' => $member->isExempt() ? 'exempt' : 'pending',
                            'exemption_reason' => $member->isExempt() ? $member->exemption_status : null,
                            'created_by' => auth()->id(),
                        ]);
                        $createdCount++;
                    }
                }
            }

            DB::commit();

            return redirect()->route('payments.index', ['year' => $year])
                ->with('success', "Successfully initialized {$createdCount} payment records for {$year}");

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to initialize payments: ' . $e->getMessage());
        }
    }

    /**
     * Store or update a payment record
     */
    public function store(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'payment_month' => 'required|integer|min:1|max:12',
            'payment_year' => 'required|integer',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'required|in:pending,paid,exempt,overdue',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|in:cash,card,bank_transfer',
            'notes' => 'nullable|string',
            'exemption_reason' => 'nullable|in:pocasni,saradnik',
        ]);

        MembershipPayment::updateOrCreate(
            [
                'member_id' => $request->member_id,
                'payment_month' => $request->payment_month,
                'payment_year' => $request->payment_year,
            ],
            [
                'paid_amount' => $request->paid_amount,
                'payment_status' => $request->payment_status,
                'payment_date' => $request->payment_date ?? ($request->payment_status === 'paid' ? now() : null),
                'payment_method' => $request->payment_method,
                'notes' => $request->notes,
                'exemption_reason' => $request->exemption_reason,
                'created_by' => auth()->id(),
            ]
        );

        return back()->with('success', 'Payment saved successfully');
    }

    /**
     * Update a payment record
     */
    public function update(Request $request, MembershipPayment $payment)
    {
        $request->validate([
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'required|in:pending,paid,exempt,overdue',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|in:cash,card,bank_transfer',
            'notes' => 'nullable|string',
            'exemption_reason' => 'nullable|in:pocasni,saradnik',
        ]);

        $payment->update([
            'paid_amount' => $request->paid_amount,
            'payment_status' => $request->payment_status,
            'payment_date' => $request->payment_date ?? ($request->payment_status === 'paid' ? now() : $payment->payment_date),
            'payment_method' => $request->payment_method,
            'notes' => $request->notes,
            'exemption_reason' => $request->exemption_reason,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Payment updated successfully');
    }

    /**
     * Delete a payment record
     */
    public function destroy(MembershipPayment $payment)
    {
        $payment->delete();

        return back()->with('success', 'Payment deleted successfully');
    }

    /**
     * Bulk mark payments as paid
     */
    public function bulkMarkPaid(Request $request)
    {
        $request->validate([
            'payment_ids' => 'required|array',
            'payment_ids.*' => 'exists:membership_payments,id',
            'amount' => 'required|numeric|min:0',
            'method' => 'required|in:cash,card,bank_transfer',
            'date' => 'nullable|date',
        ]);

        $updated = MembershipPayment::whereIn('id', $request->payment_ids)
            ->update([
                'paid_amount' => $request->amount,
                'payment_status' => 'paid',
                'payment_date' => $request->date ?? now(),
                'payment_method' => $request->method,
            ]);

        return back()->with('success', "Successfully marked {$updated} payments as paid");
    }

    /**
     * Show import CSV page
     */
    public function showImport()
    {
        // Get available years from actual payment data
        $yearsInDb = MembershipPayment::select('payment_year')
            ->distinct()
            ->orderBy('payment_year', 'desc')
            ->pluck('payment_year')
            ->toArray();

        return Inertia::render('Payments/Import', [
            'availableYears' => !empty($yearsInDb) ? $yearsInDb : [date('Y')],
        ]);
    }

    /**
     * Import payments from CSV
     */
    public function import(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $file = $request->file('csv_file');
        $csv = array_map('str_getcsv', file($file->getRealPath()));
        $header = array_shift($csv);

        $stats = ['imported' => 0, 'skipped' => 0, 'errors' => [], 'years_processed' => []];

        // Parse header to find year/month columns
        $columnMap = [];
        $monthMap = [
            'JAN' => 1, 'FEB' => 2, 'MAR' => 3, 'APR' => 4, 'MAY' => 5, 'JUN' => 6,
            'JUL' => 7, 'AUG' => 8, 'SEP' => 9, 'OCT' => 10, 'NOV' => 11, 'DEC' => 12,
            'jAN' => 1, 'fEB' => 2, 'mAR' => 3, 'aPR' => 4, 'mAJ' => 5, 'jUN' => 6,
            'jUL' => 7, 'aUG' => 8, 'sEP' => 9, 'oKT' => 10, 'nOV' => 11, 'dEC' => 12,
            'MAJ' => 5, 'OKT' => 10, // Serbian names
        ];

        foreach ($header as $colIndex => $colName) {
            $colName = trim($colName);

            // Match patterns like "JAN 2024", "jAN 2022", "MAR_2023", etc.
            if (preg_match('/^([a-zA-Z]+)\s*[_\s]?\s*(\d{4})$/i', $colName, $matches)) {
                $monthName = strtoupper(trim($matches[1]));
                $year = (int)$matches[2];

                if (isset($monthMap[$monthName])) {
                    $month = $monthMap[$monthName];
                    $columnMap[$colIndex] = ['year' => $year, 'month' => $month];

                    if (!in_array($year, $stats['years_processed'])) {
                        $stats['years_processed'][] = $year;
                    }
                }
            }
        }

        if (empty($columnMap)) {
            return back()->with('error', 'No valid date columns found. Expected format: "JAN 2024", "FEB 2024", etc.');
        }

        DB::beginTransaction();
        try {
            foreach ($csv as $rowIndex => $row) {
                if (count($row) < 2) {
                    continue; // Skip empty rows
                }

                // First column is membership number (Članski broj)
                $membershipNumber = isset($row[0]) ? trim($row[0]) : null;
                // Second column is email
                $email = isset($row[1]) ? trim($row[1]) : null;

                // Try to find member by membership number first (more reliable), then email
                $member = null;

                if (!empty($membershipNumber) && !in_array(strtolower($membershipNumber), ['clanski broj', 'članski broj', 'membership_number'])) {
                    $member = Member::where('membership_number', $membershipNumber)->first();
                }

                if (!$member && !empty($email) && $email !== 'Email') {
                    $member = Member::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
                }

                if (!$member) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row " . ($rowIndex + 2) . ": Member not found (Number: {$membershipNumber}, Email: {$email})";
                    continue;
                }

                // Process each date column
                foreach ($columnMap as $colIndex => $dateInfo) {
                    if (!isset($row[$colIndex])) {
                        continue;
                    }

                    $value = trim($row[$colIndex]);
                    $year = $dateInfo['year'];
                    $month = $dateInfo['month'];

                    $paymentData = [
                        'member_id' => $member->id,
                        'payment_year' => $year,
                        'payment_month' => $month,
                        'created_by' => auth()->id(),
                    ];

                    if (empty($value)) {
                        // Empty - skip or set as pending
                        continue;
                    } elseif (is_numeric($value)) {
                        // Paid payment
                        $paymentData['paid_amount'] = $value;
                        $paymentData['payment_status'] = 'paid';
                        $paymentData['payment_date'] = "{$year}-{$month}-01";
                        $paymentData['payment_method'] = 'cash';
                    } elseif (in_array(strtolower($value), ['pocasni', 'saradnik', 'free', 'exempt'])) {
                        // Exempt payment
                        $exemptionType = strtolower($value);
                        $paymentData['payment_status'] = 'exempt';
                        $paymentData['exemption_reason'] = $exemptionType;

                        // Update member exemption status (map 'free' to valid enum values)
                        $memberExemptionStatus = in_array($exemptionType, ['pocasni', 'saradnik']) ? $exemptionType : 'none';
                        if ($member->exemption_status !== $memberExemptionStatus) {
                            $member->update(['exemption_status' => $memberExemptionStatus]);
                        }
                    }

                    MembershipPayment::updateOrCreate(
                        [
                            'member_id' => $member->id,
                            'payment_year' => $year,
                            'payment_month' => $month,
                        ],
                        $paymentData
                    );
                }

                $stats['imported']++;
            }

            DB::commit();

            $yearsText = implode(', ', $stats['years_processed']);
            return redirect('/payments')
                ->with('success', "Imported {$stats['imported']} members for years: {$yearsText}. Skipped: {$stats['skipped']}")
                ->with('import_errors', $stats['errors']);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Import failed: ' . $e->getMessage());
        }
    }

    /**
     * Export template CSV
     */
    public function exportTemplate($year)
    {
        $members = Member::where('is_active', true)
            ->orderBy('membership_number')
            ->get();

        $csv = [];

        // Header
        $header = ['Email', 'Membership_Number', 'Name'];
        $months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

        foreach ($months as $month) {
            $header[] = "{$month}_{$year}";
        }

        $csv[] = $header;

        // Member rows
        foreach ($members as $member) {
            $row = [
                $member->email ?? '',
                $member->membership_number,
                $member->name,
            ];

            $payments = $member->paymentsForYear($year)->get()->keyBy('payment_month');

            for ($month = 1; $month <= 12; $month++) {
                $payment = $payments->get($month);

                if ($payment) {
                    if ($payment->payment_status === 'exempt') {
                        $row[] = $payment->exemption_reason;
                    } elseif ($payment->payment_status === 'paid') {
                        $row[] = $payment->paid_amount;
                    } else {
                        $row[] = '';
                    }
                } else {
                    $row[] = '';
                }
            }

            $csv[] = $row;
        }

        // Convert to CSV string
        $output = fopen('php://temp', 'r+');
        foreach ($csv as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return response($csvContent)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=payment_template_{$year}.csv");
    }

    /**
     * Get payment history for a specific member
     */
    public function memberHistory(Member $member, Request $request)
    {
        $year = $request->input('year', date('Y'));

        $payments = $member->paymentsForYear($year)
            ->orderBy('payment_month')
            ->get();

        return Inertia::render('Payments/MemberHistory', [
            'member' => $member,
            'year' => (int)$year,
            'payments' => $payments,
            'availableYears' => range(date('Y'), 2024),
        ]);
    }
}
