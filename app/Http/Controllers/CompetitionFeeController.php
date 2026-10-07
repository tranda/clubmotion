<?php

namespace App\Http\Controllers;

use App\Models\Competition;
use App\Models\CompetitionParticipant;
use App\Models\CompetitionPayment;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Competition fees: per-competition participant fees and instalment payments.
 * Kept separate from membership payments (own tables, own pages).
 */
class CompetitionFeeController extends Controller
{
    /**
     * Competition list for a year with summary cards
     */
    public function index(Request $request)
    {
        $year = (int) $request->input('year', date('Y'));
        $status = $request->input('status', 'active'); // active (incl. planned) | closed | all

        $query = Competition::with(['participants' => function ($q) {
            $q->withPaymentTotals();
        }])->where(function ($q) use ($year) {
            $q->whereYear('start_date', $year)
                ->orWhere(function ($q) use ($year) {
                    $q->whereNull('start_date')->whereYear('created_at', $year);
                });
        });

        if ($status === 'active') {
            $query->whereIn('status', ['planned', 'active']);
        } elseif ($status === 'closed') {
            $query->where('status', 'closed');
        }

        $competitions = $query->orderBy('start_date')->orderBy('name')->get();

        // Summary cards, per currency (EUR and RSD totals are never mixed).
        $summary = [];
        $rows = $competitions->map(function ($competition) use (&$summary) {
            $totals = Competition::totalsFor($competition->participants);
            $cur = $competition->currency;
            $summary[$cur] = $summary[$cur] ?? ['currency' => $cur, 'expected' => 0, 'collected' => 0, 'remaining' => 0];
            foreach (['expected', 'collected', 'remaining'] as $k) {
                $summary[$cur][$k] = round($summary[$cur][$k] + $totals[$k], 2);
            }

            return $this->competitionArray($competition) + ['totals' => $totals];
        });

        $yearsInDb = Competition::selectRaw('DISTINCT YEAR(COALESCE(start_date, created_at)) as y')
            ->pluck('y')
            ->map(fn ($y) => (int) $y)
            ->push((int) date('Y'))
            ->push($year)
            ->unique()
            ->sortDesc()
            ->values();

        return Inertia::render('Payments/CompetitionFees', [
            'year' => $year,
            'status' => $status,
            'availableYears' => $yearsInDb,
            'competitions' => $rows,
            'summary' => array_values($summary),
            'counts' => [
                'competitions' => $competitions->count(),
                'participants' => $rows->sum(fn ($r) => $r['totals']['participants']),
            ],
            'currencies' => Competition::CURRENCIES,
        ]);
    }

    public function store(Request $request)
    {
        $competition = Competition::create($this->validateCompetition($request) + [
            'created_by' => auth()->id(),
        ]);

        return redirect("/payments/competition-fees/{$competition->id}")
            ->with('success', 'Competition created');
    }

    public function update(Request $request, Competition $competition)
    {
        // Changing default_fee does not touch existing participants' fees.
        $competition->update($this->validateCompetition($request));

        return back()->with('success', 'Competition updated');
    }

    public function destroy(Competition $competition)
    {
        if ($competition->payments()->exists()) {
            return back()->with('error', 'This competition has payments and cannot be deleted. Close it instead.');
        }

        DB::transaction(function () use ($competition) {
            $competition->participants()->delete();
            $competition->delete();
        });

        return redirect('/payments/competition-fees')->with('success', 'Competition deleted');
    }

    /**
     * Competition details: participants with calculated amounts and payments
     */
    public function show(Competition $competition)
    {
        $participants = $competition->participants()
            ->withPaymentTotals()
            ->with(['member:id,name,membership_number', 'payments'])
            ->get()
            ->sortBy(fn ($p) => mb_strtolower($p->member->name ?? ''))
            ->values();

        $participantMemberIds = $participants->pluck('member_id')->all();

        // Members that can still be added (registered by the competition).
        $refDate = ($competition->start_date ?? now())->format('Y-m-d');
        $members = Member::select('id', 'name', 'membership_number', 'is_active')
            ->whereNotIn('id', $participantMemberIds)
            ->where(function ($q) use ($refDate) {
                $q->whereNull('registration_date')->orWhere('registration_date', '<=', $refDate);
            })
            ->orderBy('name')
            ->get();

        return Inertia::render('Payments/CompetitionDetails', [
            'competition' => $this->competitionArray($competition),
            'totals' => Competition::totalsFor($participants),
            'participants' => $participants->map(function ($p) {
                return $p->toSummaryArray() + [
                    'payments' => $p->payments->map(fn ($pay) => [
                        'id' => $pay->id,
                        'amount' => (float) $pay->amount,
                        'paid_at' => $pay->paid_at->format('Y-m-d'),
                        'payment_method' => $pay->payment_method,
                        'note' => $pay->note,
                        'in_ledger' => (bool) $pay->ledger_entry_id,
                    ])->values(),
                ];
            })->values(),
            'availableMembers' => $members,
            'currencies' => Competition::CURRENCIES,
            'paymentMethods' => CompetitionPayment::METHODS,
        ]);
    }

    public function addParticipants(Request $request, Competition $competition)
    {
        $request->validate([
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'integer|exists:members,id',
            'use_default_fee' => 'boolean',
            'fee_amount' => 'nullable|required_if:use_default_fee,false|numeric|min:0',
        ]);

        $fee = $request->boolean('use_default_fee', true)
            ? (float) ($competition->default_fee ?? 0)
            : (float) $request->input('fee_amount');

        $existing = $competition->participants()->pluck('member_id')->all();
        $added = 0;
        foreach (array_unique($request->input('member_ids')) as $memberId) {
            if (in_array((int) $memberId, $existing, true)) {
                continue; // no duplicates
            }
            $competition->participants()->create([
                'member_id' => $memberId,
                'fee_amount' => $fee,
                'status' => 'active',
            ]);
            $added++;
        }

        return back()->with('success', "Added {$added} participant(s)");
    }

    public function updateParticipant(Request $request, CompetitionParticipant $participant)
    {
        $participant->update($request->validate([
            'fee_amount' => 'required|numeric|min:0',
            'status' => ['required', Rule::in(CompetitionParticipant::STATUSES)],
            'notes' => 'nullable|string|max:1000',
        ]));

        return back()->with('success', 'Participant updated');
    }

    /**
     * Remove a participant: deleted if they have no payments, otherwise
     * marked cancelled so the payment history is kept.
     */
    public function destroyParticipant(CompetitionParticipant $participant)
    {
        if ($participant->payments()->exists()) {
            $participant->update(['status' => 'cancelled']);
            return back()->with('success', 'Participant has payments, so it was marked Cancelled instead of removed');
        }

        $participant->delete();

        return back()->with('success', 'Participant removed');
    }

    public function storePayment(Request $request, CompetitionParticipant $participant)
    {
        $participant->payments()->create($this->validatePayment($request) + [
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Payment added');
    }

    public function updatePayment(Request $request, CompetitionPayment $payment)
    {
        $payment->update($this->validatePayment($request));

        return back()->with('success', 'Payment updated');
    }

    public function destroyPayment(CompetitionPayment $payment)
    {
        $payment->delete();

        return back()->with('success', 'Payment deleted');
    }

    /**
     * Download payment status for one competition (XLSX or CSV)
     */
    public function export(Request $request, Competition $competition)
    {
        $format = $request->input('format', 'xlsx') === 'csv' ? 'csv' : 'xlsx';

        $participants = $competition->participants()
            ->withPaymentTotals()
            ->with(['member:id,name', 'payments'])
            ->get()
            ->sortBy(fn ($p) => mb_strtolower($p->member->name ?? ''))
            ->values();

        $cur = $competition->currency;
        $statusRows = $participants->map(fn ($p) => [
            $p->member->name ?? '?',
            (float) $p->fee_amount,
            $p->paid_amount,
            $p->remaining_amount,
            ucfirst($p->payment_status),
            $p->last_payment_at ? date('d.m.Y', strtotime($p->last_payment_at)) : '',
        ])->all();
        $statusHeader = ['Member', "Fee ({$cur})", "Paid ({$cur})", "Remaining ({$cur})", 'Status', 'Last payment'];

        $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(\Illuminate\Support\Str::ascii($competition->name))), '-');
        $filename = "competition-fees_{$slug}.{$format}";

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($statusHeader, $statusRows) {
                $out = fopen('php://output', 'w');
                // UTF-8 BOM + ';' separator so Excel (Serbian locale) opens it cleanly.
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $statusHeader, ';');
                foreach ($statusRows as $row) {
                    fputcsv($out, $row, ';');
                }
                fclose($out);
            }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        $spreadsheet = new Spreadsheet();

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Status');
        $sheet->setCellValue('A1', $competition->name . ($this->dateRange($competition) ? ' — ' . $this->dateRange($competition) : ''));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->fromArray($statusHeader, null, 'A3');
        $this->headerStyle($sheet, 'A3:F3');
        $r = 4;
        foreach ($statusRows as $row) {
            $sheet->fromArray($row, null, "A{$r}", true);
            $r++;
        }
        $totals = Competition::totalsFor($participants);
        $sheet->fromArray(['Total', $totals['expected'], $totals['collected'], $totals['remaining']], null, "A{$r}", true);
        $sheet->getStyle("A{$r}:F{$r}")->getFont()->setBold(true);
        $sheet->getStyle("B4:D{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Payments');
        $sheet->fromArray(['Member', 'Payment date', "Amount ({$cur})", 'Method', 'Note'], null, 'A1');
        $this->headerStyle($sheet, 'A1:E1');
        $r = 2;
        foreach ($participants as $p) {
            foreach ($p->payments->sortBy('paid_at') as $pay) {
                $sheet->fromArray([
                    $p->member->name ?? '?',
                    $pay->paid_at->format('d.m.Y'),
                    (float) $pay->amount,
                    $this->methodLabel($pay->payment_method),
                    $pay->note,
                ], null, "A{$r}", true);
                $r++;
            }
        }
        $sheet->getStyle("C2:C{$r}")->getNumberFormat()->setFormatCode('#,##0.00');
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $spreadsheet->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function validateCompetition(Request $request)
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'default_fee' => 'nullable|numeric|min:0',
            'currency' => ['required', Rule::in(Competition::CURRENCIES)],
            'status' => ['required', Rule::in(Competition::STATUSES)],
            'notes' => 'nullable|string|max:2000',
        ]);
    }

    private function validatePayment(Request $request)
    {
        return $request->validate([
            'amount' => 'required|numeric|gt:0',
            'paid_at' => 'required|date',
            'payment_method' => ['required', Rule::in(CompetitionPayment::METHODS)],
            'note' => 'nullable|string|max:255',
        ]);
    }

    private function competitionArray(Competition $competition)
    {
        return [
            'id' => $competition->id,
            'name' => $competition->name,
            'location' => $competition->location,
            'start_date' => $competition->start_date?->format('Y-m-d'),
            'end_date' => $competition->end_date?->format('Y-m-d'),
            'date_range' => $this->dateRange($competition),
            'default_fee' => $competition->default_fee !== null ? (float) $competition->default_fee : null,
            'currency' => $competition->currency,
            'status' => $competition->status,
            'notes' => $competition->notes,
        ];
    }

    /**
     * "27–31 May 2027", "30 May – 2 Jun 2027", "22 Aug 2027" or ''.
     */
    private function dateRange(Competition $competition)
    {
        $start = $competition->start_date;
        $end = $competition->end_date;
        if (!$start) {
            return '';
        }
        if (!$end || $end->isSameDay($start)) {
            return $start->format('j M Y');
        }
        if ($start->format('Y-m') === $end->format('Y-m')) {
            return $start->format('j') . '–' . $end->format('j M Y');
        }
        if ($start->format('Y') === $end->format('Y')) {
            return $start->format('j M') . ' – ' . $end->format('j M Y');
        }

        return $start->format('j M Y') . ' – ' . $end->format('j M Y');
    }

    private function methodLabel($method)
    {
        return ['cash' => 'Cash', 'bank_transfer' => 'Bank transfer', 'other' => 'Other'][$method] ?? '';
    }

    private function headerStyle($sheet, string $range)
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']],
        ]);
    }
}
