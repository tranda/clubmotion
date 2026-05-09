<?php

namespace App\Http\Controllers;

use App\Models\LedgerCategory;
use App\Models\LedgerEntry;
use App\Models\Member;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LedgerReportController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April',
        5 => 'May', 6 => 'June', 7 => 'July', 8 => 'August',
        9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December',
    ];

    public function annual(Request $request)
    {
        $year = (int) $request->input('year', Carbon::now()->year);
        $data = $this->assembleAnnual($year);
        $data['availableYears'] = $this->availableYears();
        return Inertia::render('Ledger/Reports/Annual', $data);
    }

    public function annualPdf(Request $request)
    {
        $year = (int) $request->input('year', Carbon::now()->year);
        $data = $this->assembleAnnual($year);
        $pdf = Pdf::loadView('reports.annual', $data)
            ->setPaper('a4', 'portrait');
        return $pdf->download(sprintf('ledger-annual-%d.pdf', $year));
    }

    public function annualExcel(Request $request)
    {
        $year = (int) $request->input('year', Carbon::now()->year);
        $data = $this->assembleAnnual($year);

        $spreadsheet = new Spreadsheet();
        $this->buildSummarySheet($spreadsheet->getActiveSheet(), $data);
        $this->buildMonthlySheet($spreadsheet->createSheet(), $data);
        $this->buildCategoriesSheet($spreadsheet->createSheet(), $data);
        $this->buildMembersSheet($spreadsheet->createSheet(), $data);
        $spreadsheet->setActiveSheetIndex(0);

        $filename = sprintf('ledger-annual-%d.xlsx', $year);
        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ─── Data assembly ───────────────────────────────────────────────────────

    private function assembleAnnual(int $year): array
    {
        $buckets = LedgerEntry::BUCKETS;

        // Year totals per bucket × type
        $totals = ['income' => [], 'expense' => [], 'net' => []];
        foreach ($buckets as $b) {
            $income = (float) LedgerEntry::query()
                ->forYear($year)
                ->where('bucket', $b)
                ->where('type', 'income')
                ->sum('amount');
            $expense = (float) LedgerEntry::query()
                ->forYear($year)
                ->where('bucket', $b)
                ->where('type', 'expense')
                ->sum('amount');
            $totals['income'][$b] = $income;
            $totals['expense'][$b] = $expense;
            $totals['net'][$b] = $income - $expense;
        }

        // Monthly breakdown
        $seedYear = $this->earliestSeedYear() ?? $year;
        $monthly = [];
        for ($m = 1; $m <= 12; $m++) {
            $row = [
                'month' => $m,
                'name' => self::MONTH_NAMES[$m],
                'income' => [],
                'expense' => [],
                'closing' => [],
            ];
            $monthEnd = sprintf('%04d-%02d-%02d', $year, $m, (int) date('t', strtotime(sprintf('%04d-%02d-01', $year, $m))));
            foreach ($buckets as $b) {
                $income = (float) LedgerEntry::query()
                    ->forMonth($year, $m)
                    ->where('bucket', $b)
                    ->where('type', 'income')
                    ->sum('amount');
                $expense = (float) LedgerEntry::query()
                    ->forMonth($year, $m)
                    ->where('bucket', $b)
                    ->where('type', 'expense')
                    ->sum('amount');
                $row['income'][$b] = $income;
                $row['expense'][$b] = $expense;
                $row['closing'][$b] = LedgerEntry::runningBalance($b, $monthEnd, $seedYear);
            }
            $monthly[] = $row;
        }

        // Per-category totals for the year
        $categoriesQuery = LedgerEntry::query()
            ->forYear($year)
            ->select('ledger_category_id', 'type', DB::raw('SUM(amount) as sum_amount'))
            ->groupBy('ledger_category_id', 'type')
            ->get();
        $catMap = [];
        foreach ($categoriesQuery as $row) {
            $key = $row->ledger_category_id ?? 'none';
            if (!isset($catMap[$key])) {
                $catMap[$key] = ['income_total' => 0.0, 'expense_total' => 0.0];
            }
            $catMap[$key][$row->type . '_total'] = (float) $row->sum_amount;
        }
        $categoryNames = LedgerCategory::pluck('name', 'id');
        $categories = [];
        foreach ($catMap as $catId => $vals) {
            $categories[] = [
                'id' => $catId === 'none' ? null : (int) $catId,
                'name' => $catId === 'none' ? '— Uncategorized —' : ($categoryNames[$catId] ?? '?'),
                'income_total' => $vals['income_total'],
                'expense_total' => $vals['expense_total'],
                'net' => $vals['income_total'] - $vals['expense_total'],
            ];
        }
        usort($categories, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        // Per-member contributions (income only)
        $memberRows = LedgerEntry::query()
            ->forYear($year)
            ->where('type', 'income')
            ->whereNotNull('member_id')
            ->select('member_id', 'ledger_category_id', DB::raw('SUM(amount) as sum_amount'))
            ->groupBy('member_id', 'ledger_category_id')
            ->get();
        $membershipCatId = optional(LedgerCategory::where('normalized_name', 'membership')->first())->id;
        $registrationCatId = optional(LedgerCategory::where('normalized_name', 'registration')->first())->id;
        $memberMap = [];
        foreach ($memberRows as $row) {
            $mid = $row->member_id;
            if (!isset($memberMap[$mid])) {
                $memberMap[$mid] = ['membership' => 0.0, 'registration' => 0.0, 'other' => 0.0];
            }
            $amount = (float) $row->sum_amount;
            if ($row->ledger_category_id === $membershipCatId) {
                $memberMap[$mid]['membership'] += $amount;
            } elseif ($row->ledger_category_id === $registrationCatId) {
                $memberMap[$mid]['registration'] += $amount;
            } else {
                $memberMap[$mid]['other'] += $amount;
            }
        }
        $memberNames = Member::whereIn('id', array_keys($memberMap))
            ->pluck('name', 'id');
        $members = [];
        foreach ($memberMap as $mid => $vals) {
            $members[] = [
                'id' => (int) $mid,
                'name' => $memberNames[$mid] ?? '?',
                'membership' => $vals['membership'],
                'registration' => $vals['registration'],
                'other' => $vals['other'],
                'total' => $vals['membership'] + $vals['registration'] + $vals['other'],
            ];
        }
        usort($members, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        return [
            'year' => $year,
            'totals' => $totals,
            'monthly' => $monthly,
            'categories' => $categories,
            'members' => $members,
        ];
    }

    private function availableYears(): array
    {
        $years = LedgerEntry::query()
            ->selectRaw('DISTINCT YEAR(entry_date) as y')
            ->orderBy('y', 'desc')
            ->pluck('y')
            ->map(fn ($v) => (int) $v)
            ->toArray();
        if (empty($years)) {
            $years = [(int) Carbon::now()->year];
        }
        return $years;
    }

    private function earliestSeedYear(): ?int
    {
        $row = DB::table('payment_settings')
            ->where('key', 'like', 'ledger_opening_balance_%')
            ->orderBy('key')
            ->first();
        if (!$row) return null;
        if (preg_match('/_(\d{4})$/', $row->key, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    // ─── Excel sheet builders ────────────────────────────────────────────────

    private function buildSummarySheet($sheet, array $data): void
    {
        $sheet->setTitle('Summary');
        $sheet->setCellValue('A1', sprintf('Annual Ledger Report — %d', $data['year']));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->mergeCells('A1:D1');

        $sheet->setCellValue('A3', '');
        $sheet->setCellValue('B3', 'Cash');
        $sheet->setCellValue('C3', 'Bank');
        $sheet->setCellValue('D3', 'EUR');
        $this->headerStyle($sheet, 'A3:D3');

        $rows = [
            ['Income', $data['totals']['income']['cash'], $data['totals']['income']['bank'], $data['totals']['income']['eur']],
            ['Expenses', $data['totals']['expense']['cash'], $data['totals']['expense']['bank'], $data['totals']['expense']['eur']],
            ['Net', $data['totals']['net']['cash'], $data['totals']['net']['bank'], $data['totals']['net']['eur']],
        ];
        $r = 4;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$r}", $row[0]);
            $sheet->setCellValue("B{$r}", $row[1]);
            $sheet->setCellValue("C{$r}", $row[2]);
            $sheet->setCellValue("D{$r}", $row[3]);
            $sheet->getStyle("B{$r}:D{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
            $r++;
        }
        $sheet->getStyle("A6:D6")->getFont()->setBold(true);
        foreach (['A', 'B', 'C', 'D'] as $col) $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    private function buildMonthlySheet($sheet, array $data): void
    {
        $sheet->setTitle('Monthly');
        $sheet->setCellValue('A1', 'Month');
        $sheet->setCellValue('B1', 'Income (Cash)');
        $sheet->setCellValue('C1', 'Income (Bank)');
        $sheet->setCellValue('D1', 'Income (EUR)');
        $sheet->setCellValue('E1', 'Expense (Cash)');
        $sheet->setCellValue('F1', 'Expense (Bank)');
        $sheet->setCellValue('G1', 'Expense (EUR)');
        $sheet->setCellValue('H1', 'Closing (Cash)');
        $sheet->setCellValue('I1', 'Closing (Bank)');
        $sheet->setCellValue('J1', 'Closing (EUR)');
        $this->headerStyle($sheet, 'A1:J1');

        $r = 2;
        foreach ($data['monthly'] as $m) {
            $sheet->setCellValue("A{$r}", $m['name']);
            $sheet->setCellValue("B{$r}", $m['income']['cash']);
            $sheet->setCellValue("C{$r}", $m['income']['bank']);
            $sheet->setCellValue("D{$r}", $m['income']['eur']);
            $sheet->setCellValue("E{$r}", $m['expense']['cash']);
            $sheet->setCellValue("F{$r}", $m['expense']['bank']);
            $sheet->setCellValue("G{$r}", $m['expense']['eur']);
            $sheet->setCellValue("H{$r}", $m['closing']['cash']);
            $sheet->setCellValue("I{$r}", $m['closing']['bank']);
            $sheet->setCellValue("J{$r}", $m['closing']['eur']);
            $sheet->getStyle("B{$r}:J{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
            $r++;
        }
        foreach (range('A', 'J') as $col) $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    private function buildCategoriesSheet($sheet, array $data): void
    {
        $sheet->setTitle('Categories');
        $sheet->setCellValue('A1', 'Category');
        $sheet->setCellValue('B1', 'Income');
        $sheet->setCellValue('C1', 'Expense');
        $sheet->setCellValue('D1', 'Net');
        $this->headerStyle($sheet, 'A1:D1');

        $r = 2;
        foreach ($data['categories'] as $c) {
            $sheet->setCellValue("A{$r}", $c['name']);
            $sheet->setCellValue("B{$r}", $c['income_total']);
            $sheet->setCellValue("C{$r}", $c['expense_total']);
            $sheet->setCellValue("D{$r}", $c['net']);
            $sheet->getStyle("B{$r}:D{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
            $r++;
        }
        foreach (['A', 'B', 'C', 'D'] as $col) $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    private function buildMembersSheet($sheet, array $data): void
    {
        $sheet->setTitle('Members');
        $sheet->setCellValue('A1', 'Member');
        $sheet->setCellValue('B1', 'Membership');
        $sheet->setCellValue('C1', 'Registration');
        $sheet->setCellValue('D1', 'Other Income');
        $sheet->setCellValue('E1', 'Total');
        $this->headerStyle($sheet, 'A1:E1');

        $r = 2;
        foreach ($data['members'] as $m) {
            $sheet->setCellValue("A{$r}", $m['name']);
            $sheet->setCellValue("B{$r}", $m['membership']);
            $sheet->setCellValue("C{$r}", $m['registration']);
            $sheet->setCellValue("D{$r}", $m['other']);
            $sheet->setCellValue("E{$r}", $m['total']);
            $sheet->getStyle("B{$r}:E{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
            $r++;
        }
        foreach (['A', 'B', 'C', 'D', 'E'] as $col) $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    private function headerStyle($sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
    }
}
