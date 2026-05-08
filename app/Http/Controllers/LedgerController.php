<?php

namespace App\Http\Controllers;

use App\Models\LedgerCategory;
use App\Models\LedgerEntry;
use App\Models\LedgerImportBatch;
use App\Models\LedgerImportStagingRow;
use App\Models\Member;
use App\Models\PaymentSetting;
use App\Services\Ledger\LedgerCsvParser;
use App\Services\Ledger\XlsxSheetReader;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LedgerController extends Controller
{
    // ─── Month view ──────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $now = Carbon::now();
        $year = (int) $request->input('year', $now->year);
        $month = (int) $request->input('month', $now->month);
        $year = max(2000, min(2100, $year));
        $month = max(1, min(12, $month));

        $entries = LedgerEntry::with(['category', 'member'])
            ->forMonth($year, $month)
            ->orderBy('entry_date')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($e) => $this->formatEntry($e));

        $seedYear = $this->earliestSeedYear();

        $monthStartDate = sprintf('%04d-%02d-01', $year, $month);
        $monthEndDate = date('Y-m-t', strtotime($monthStartDate));
        $priorDate = date('Y-m-d', strtotime($monthStartDate . ' -1 day'));

        $opening = [];
        $closing = [];
        $monthlyTotals = ['income' => [], 'expense' => []];
        foreach (LedgerEntry::BUCKETS as $bucket) {
            $opening[$bucket] = LedgerEntry::runningBalance($bucket, $priorDate, $seedYear);
            $closing[$bucket] = LedgerEntry::runningBalance($bucket, $monthEndDate, $seedYear);
            $monthlyTotals['income'][$bucket] = (float) LedgerEntry::query()
                ->where('bucket', $bucket)
                ->where('type', 'income')
                ->forMonth($year, $month)
                ->sum('amount');
            $monthlyTotals['expense'][$bucket] = (float) LedgerEntry::query()
                ->where('bucket', $bucket)
                ->where('type', 'expense')
                ->forMonth($year, $month)
                ->sum('amount');
        }

        $availableYears = LedgerEntry::query()
            ->selectRaw('DISTINCT YEAR(entry_date) as y')
            ->orderBy('y', 'desc')
            ->pluck('y')
            ->map(fn ($v) => (int) $v)
            ->toArray();
        if (empty($availableYears)) {
            $availableYears = [(int) $now->year];
        }

        return Inertia::render('Ledger/Index', [
            'year' => $year,
            'month' => $month,
            'entries' => $entries,
            'opening' => $opening,
            'closing' => $closing,
            'monthlyTotals' => $monthlyTotals,
            'pettyCashFloat' => (float) PaymentSetting::get('ledger_petty_cash_float_rsd', 0),
            'availableYears' => $availableYears,
            'categories' => LedgerCategory::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'kind', 'is_active']),
            'members' => Member::where('is_active', true)->orderBy('name')->get(['id', 'name', 'membership_number']),
            'deletedCount' => LedgerEntry::onlyTrashed()->forMonth($year, $month)->count(),
        ]);
    }

    public function deletedEntries(int $year, int $month)
    {
        $entries = LedgerEntry::onlyTrashed()
            ->with('category', 'deleter')
            ->forMonth($year, $month)
            ->orderBy('entry_date')
            ->orderBy('id')
            ->get()
            ->map(fn ($e) => $this->formatEntry($e));

        return Inertia::render('Ledger/Deleted', [
            'year' => $year,
            'month' => $month,
            'entries' => $entries,
        ]);
    }

    // ─── Entry CRUD ──────────────────────────────────────────────────────────

    public function storeEntry(Request $request)
    {
        $data = $this->validateEntry($request);

        $entry = LedgerEntry::create(array_merge($data, [
            'source' => 'manual',
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]));

        return redirect()->back()->with('success', 'Entry added.');
    }

    public function updateEntry(Request $request, LedgerEntry $entry)
    {
        $data = $this->validateEntry($request);

        $entry->fill($data);
        $entry->updated_by = auth()->id();
        if ($entry->source === 'import') {
            $entry->source = 'manual';
        }
        $entry->save();

        return redirect()->back()->with('success', 'Entry updated.');
    }

    public function destroyEntry(LedgerEntry $entry)
    {
        $entry->deleted_by = auth()->id();
        $entry->save();
        $entry->delete();

        return redirect()->back()->with('success', 'Entry deleted.');
    }

    public function restoreEntry(int $id)
    {
        $entry = LedgerEntry::onlyTrashed()->findOrFail($id);
        $entry->restore();
        $entry->deleted_by = null;
        $entry->save();

        return redirect()->back()->with('success', 'Entry restored.');
    }

    private function validateEntry(Request $request): array
    {
        return $request->validate([
            'entry_date' => 'required|date',
            'type' => 'required|in:income,expense',
            'bucket' => 'required|in:cash,bank,eur',
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string|max:255',
            'ledger_category_id' => 'nullable|exists:ledger_categories,id',
            'member_id' => 'nullable|exists:members,id',
            'notes' => 'nullable|string',
        ]);
    }

    // ─── Category CRUD ───────────────────────────────────────────────────────

    public function categoriesIndex()
    {
        return Inertia::render('Ledger/Categories', [
            'categories' => LedgerCategory::withCount('entries')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function categoriesStore(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'kind' => 'required|in:income,expense,both',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $normalized = LedgerCategory::normalize($data['name']);
        if (LedgerCategory::where('normalized_name', $normalized)->exists()) {
            return redirect()->back()->with('error', 'A category with this name already exists.');
        }

        LedgerCategory::create([
            'name' => trim($data['name']),
            'normalized_name' => $normalized,
            'kind' => $data['kind'],
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return redirect()->route('ledger.categories.index')->with('success', 'Category created.');
    }

    public function categoriesUpdate(Request $request, LedgerCategory $category)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'kind' => 'required|in:income,expense,both',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $normalized = LedgerCategory::normalize($data['name']);
        $exists = LedgerCategory::where('normalized_name', $normalized)
            ->where('id', '!=', $category->id)
            ->exists();
        if ($exists) {
            return redirect()->back()->with('error', 'Another category already uses this name.');
        }

        $category->update([
            'name' => trim($data['name']),
            'normalized_name' => $normalized,
            'kind' => $data['kind'],
            'is_active' => $data['is_active'] ?? $category->is_active,
            'sort_order' => $data['sort_order'] ?? $category->sort_order,
        ]);

        return redirect()->route('ledger.categories.index')->with('success', 'Category updated.');
    }

    public function categoriesDestroy(LedgerCategory $category)
    {
        $category->delete();
        return redirect()->route('ledger.categories.index')->with('success', 'Category deleted.');
    }

    // ─── Petty cash setting ──────────────────────────────────────────────────

    public function updatePettyCash(Request $request)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0',
        ]);
        PaymentSetting::set('ledger_petty_cash_float_rsd', (string) $data['amount']);
        return redirect()->back()->with('success', 'Petty cash float updated.');
    }

    // ─── Import: start ───────────────────────────────────────────────────────

    public function importForm()
    {
        $batches = LedgerImportBatch::orderBy('id', 'desc')
            ->withCount(['entries as entry_count' => function ($q) {
                $q->withTrashed();
            }])
            ->limit(10)
            ->get();
        return Inertia::render('Ledger/Import', [
            'recentBatches' => $batches,
        ]);
    }

    public function importStart(Request $request, LedgerCsvParser $parser, XlsxSheetReader $xlsx)
    {
        $request->validate([
            'xlsx_file' => 'required|file|mimes:xlsx,ods,xls|max:20480',
            'default_year' => 'nullable|integer|min:2000|max:2100',
        ]);

        $upload = $request->file('xlsx_file');

        try {
            $tabs = $xlsx->read($upload->getRealPath());
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Import failed: ' . $e->getMessage());
        }
        if (empty($tabs)) {
            return redirect()->back()->with('error', 'No sheets found in the file.');
        }

        $batch = LedgerImportBatch::create([
            'source_url' => 'file:' . $upload->getClientOriginalName(),
            'status' => 'staging',
            'created_by' => auth()->id(),
        ]);

        $defaultYear = $request->input('default_year') ?? (int) Carbon::now()->year;

        $memberMatcher = $this->buildMemberMatcher();
        $membershipCatId = $this->ensureCategory('Membership', 'income');
        $registrationCatId = $this->ensureCategory('Registration', 'income');

        foreach ($tabs as $tab) {
            $tabYear = $this->yearFromLabel($tab['label'], $defaultYear);
            $rows = $parser->parseTab($tab['csv'], $tab['label'], $tabYear);
            foreach ($rows as $idx => $row) {
                $normalized = LedgerCategory::normalize((string) ($row['description'] ?? ''));
                $suggestedCatId = $normalized
                    ? optional(LedgerCategory::where('normalized_name', $normalized)->first())->id
                    : null;
                $suggestedMemberId = $memberMatcher($normalized);

                // For INCOME rows with a suggested member, auto-pick category:
                // 'reg' in description → Registration, otherwise → Membership.
                if ($suggestedMemberId && ($row['type'] ?? null) === 'income') {
                    $suggestedCatId = str_contains($normalized, 'reg')
                        ? $registrationCatId
                        : $membershipCatId;
                }

                LedgerImportStagingRow::create([
                    'batch_id' => $batch->id,
                    'tab_gid' => $tab['gid'],
                    'tab_label' => $tab['label'],
                    'raw_row_json' => $row['raw'] ?? [],
                    'parsed_date' => $row['date'] ?? null,
                    'parsed_type' => $row['type'] ?? null,
                    'parsed_bucket' => $row['bucket'] ?? null,
                    'parsed_amount' => $row['amount'] ?? null,
                    'parsed_description' => $row['description'] ?? null,
                    'normalized_description' => $normalized ?: null,
                    'suggested_category_id' => $suggestedCatId,
                    'mapped_category_id' => $suggestedCatId,
                    'suggested_member_id' => $suggestedMemberId,
                    'mapped_member_id' => $suggestedMemberId,
                    'action' => $suggestedCatId ? 'map_existing' : 'import_new_category',
                    'error' => $row['error'] ?? null,
                    'sort_order' => $idx,
                ]);
            }

            $openingBalances = $parser->detectOpeningBalances($tab['csv']);
            foreach ($openingBalances as $bucket => $amount) {
                if ($amount === null) continue;
                $key = LedgerEntry::openingBalanceKey($bucket, $tabYear);
                if (PaymentSetting::get($key) === null) {
                    PaymentSetting::set(
                        $key,
                        (string) $amount,
                        "Opening balance ({$bucket}) for {$tabYear}, seeded from import"
                    );
                }
            }
        }

        return redirect()->route('ledger.import.review', $batch->id);
    }

    public function importReview(LedgerImportBatch $batch)
    {
        if ($batch->status !== 'staging') {
            return redirect()->route('ledger.import.form')->with('error', 'Batch already ' . $batch->status . '.');
        }

        $stagingRows = $batch->stagingRows()
            ->with('suggestedCategory', 'mappedCategory', 'suggestedMember', 'mappedMember')
            ->orderBy('tab_label')
            ->orderBy('parsed_date')
            ->orderBy('sort_order')
            ->get();

        $groups = $stagingRows
            ->filter(fn ($r) => $r->parsed_date && $r->parsed_amount !== null)
            ->groupBy(fn ($r) => ($r->normalized_description ?? '') . '|' . ($r->parsed_type ?? '') . '|' . ($r->parsed_bucket ?? ''))
            ->map(function ($rows, $key) {
                $first = $rows->first();
                return [
                    'key' => $key,
                    'description' => $first->parsed_description,
                    'normalized_description' => $first->normalized_description,
                    'type' => $first->parsed_type,
                    'bucket' => $first->parsed_bucket,
                    'count' => $rows->count(),
                    'sample_dates' => $rows->take(3)->pluck('parsed_date')->map(fn ($d) => $d ? $d->format('Y-m-d') : null)->values(),
                    'suggested_category_id' => $first->suggested_category_id,
                    'mapped_category_id' => $first->mapped_category_id,
                    'suggested_member_id' => $first->suggested_member_id,
                    'mapped_member_id' => $first->mapped_member_id,
                    'action' => $first->action,
                    'row_ids' => $rows->pluck('id')->values(),
                ];
            })->values();

        $summary = [
            'total_rows' => $stagingRows->count(),
            'parseable_rows' => $stagingRows->where('parsed_date', '!=', null)->where('parsed_amount', '!=', null)->count(),
            'errors' => $stagingRows->where('error', '!=', null)->count(),
            'tabs' => $stagingRows->groupBy('tab_label')->map->count(),
        ];

        return Inertia::render('Ledger/ImportReview', [
            'batch' => $batch,
            'groups' => $groups,
            'summary' => $summary,
            'categories' => LedgerCategory::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'kind']),
            'members' => Member::where('is_active', true)->orderBy('name')->get(['id', 'name', 'membership_number']),
            'memberCategoryIds' => [
                'membership' => $this->ensureCategory('Membership', 'income'),
                'registration' => $this->ensureCategory('Registration', 'income'),
            ],
        ]);
    }

    public function importCommit(Request $request, LedgerImportBatch $batch)
    {
        if ($batch->status !== 'staging') {
            return redirect()->route('ledger.import.form')->with('error', 'Batch already ' . $batch->status . '.');
        }

        $data = $request->validate([
            'mappings' => 'required|array',
            'mappings.*.row_ids' => 'required|array',
            'mappings.*.row_ids.*' => 'integer',
            'mappings.*.action' => 'required|in:import_new_category,map_existing,import_uncategorized,skip',
            'mappings.*.mapped_category_id' => 'nullable|integer|exists:ledger_categories,id',
            'mappings.*.new_category_name' => 'nullable|string|max:150',
            'mappings.*.new_category_kind' => 'nullable|in:income,expense,both',
            'mappings.*.mapped_member_id' => 'nullable|integer|exists:members,id',
        ]);

        $stats = ['created' => 0, 'skipped_manual' => 0, 'skipped_existing' => 0, 'skipped_user' => 0, 'invalid' => 0];
        $byTab = [];

        DB::beginTransaction();
        $lockAcquired = false;
        try {
            $lock = DB::selectOne("SELECT GET_LOCK('ledger_import', 0) AS got");
            $lockAcquired = $lock && (int) $lock->got === 1;
            if (!$lockAcquired) {
                DB::rollBack();
                return redirect()->back()->with('error', 'Another import is in progress. Try again shortly.');
            }

            foreach ($data['mappings'] as $mapping) {
                $rows = LedgerImportStagingRow::whereIn('id', $mapping['row_ids'])
                    ->where('batch_id', $batch->id)
                    ->get();

                $resolvedCategoryId = null;
                $action = $mapping['action'];

                if ($action === 'skip') {
                    foreach ($rows as $row) {
                        $row->action = 'skip';
                        $row->save();
                        $stats['skipped_user']++;
                    }
                    continue;
                }
                if ($action === 'map_existing') {
                    $resolvedCategoryId = $mapping['mapped_category_id'] ?? null;
                }
                if ($action === 'import_new_category') {
                    $name = trim($mapping['new_category_name'] ?? '');
                    if ($name === '') {
                        // Fall back: use first row's description as category name
                        $name = trim($rows->first()->parsed_description ?? 'Uncategorized');
                    }
                    $normalized = LedgerCategory::normalize($name);
                    $cat = LedgerCategory::firstOrCreate(
                        ['normalized_name' => $normalized],
                        [
                            'name' => $name,
                            'kind' => $mapping['new_category_kind'] ?? 'both',
                            'is_active' => true,
                            'sort_order' => 0,
                        ]
                    );
                    $resolvedCategoryId = $cat->id;
                }

                foreach ($rows as $row) {
                    if (!$row->parsed_date || $row->parsed_amount === null || !$row->parsed_type || !$row->parsed_bucket) {
                        $stats['invalid']++;
                        continue;
                    }
                    $hash = LedgerEntry::buildSourceHash([
                        'entry_date' => $row->parsed_date->format('Y-m-d'),
                        'bucket' => $row->parsed_bucket,
                        'type' => $row->parsed_type,
                        'amount' => $row->parsed_amount,
                        'description' => $row->parsed_description ?? '',
                    ]);

                    $existing = LedgerEntry::withTrashed()->where('source_hash', $hash)->first();
                    if ($existing) {
                        if ($existing->source === 'manual') {
                            $stats['skipped_manual']++;
                        } else {
                            $stats['skipped_existing']++;
                        }
                        continue;
                    }

                    LedgerEntry::create([
                        'entry_date' => $row->parsed_date->format('Y-m-d'),
                        'type' => $row->parsed_type,
                        'bucket' => $row->parsed_bucket,
                        'amount' => $row->parsed_amount,
                        'description' => $row->parsed_description ?? '',
                        'ledger_category_id' => $resolvedCategoryId,
                        'member_id' => $mapping['mapped_member_id'] ?? null,
                        'source' => 'import',
                        'source_hash' => $hash,
                        'import_batch_id' => $batch->id,
                        'sort_order' => (int) $row->sort_order,
                        'created_by' => auth()->id(),
                        'updated_by' => auth()->id(),
                    ]);
                    $stats['created']++;
                    $tab = $row->tab_label ?: 'unknown';
                    $byTab[$tab] = ($byTab[$tab] ?? 0) + 1;

                    $row->action = $action;
                    $row->mapped_category_id = $resolvedCategoryId;
                    $row->mapped_member_id = $mapping['mapped_member_id'] ?? null;
                    $row->save();
                }
            }

            $batch->status = 'committed';
            $batch->summary_json = ['stats' => $stats, 'by_tab' => $byTab];
            $batch->save();

            DB::statement("SELECT RELEASE_LOCK('ledger_import')");
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($lockAcquired) {
                DB::statement("SELECT RELEASE_LOCK('ledger_import')");
            }
            return redirect()->back()->with('error', 'Import failed: ' . $e->getMessage());
        }

        return redirect()->route('ledger.index')->with(
            'success',
            sprintf(
                'Import committed: %d created, %d skipped (already imported), %d skipped (manual edits), %d skipped by you.',
                $stats['created'],
                $stats['skipped_existing'],
                $stats['skipped_manual'],
                $stats['skipped_user']
            )
        );
    }

    public function importCancel(LedgerImportBatch $batch)
    {
        if ($batch->status === 'committed') {
            return redirect()->back()->with('error', 'Cannot cancel a committed batch — use "Wipe" to remove its entries.');
        }
        $batch->stagingRows()->delete();
        $batch->status = 'cancelled';
        $batch->save();
        return redirect()->route('ledger.import.form')->with('success', 'Import cancelled.');
    }

    /**
     * Permanently delete a batch and every ledger entry it created. Used when
     * the admin wants to re-import from scratch (e.g. after a parser change).
     * Hard-deletes (force) — soft-delete wouldn't help because the import
     * idempotency check looks at trashed rows too.
     */
    public function importWipe(LedgerImportBatch $batch)
    {
        $entriesDeleted = DB::transaction(function () use ($batch) {
            $count = LedgerEntry::withTrashed()
                ->where('import_batch_id', $batch->id)
                ->forceDelete();
            $batch->stagingRows()->delete();
            $batch->delete();
            return $count;
        });

        return redirect()->route('ledger.import.form')->with(
            'success',
            "Batch wiped — removed {$entriesDeleted} ledger entries. You can re-import now."
        );
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    public function export(int $year, ?int $month = null)
    {
        $query = LedgerEntry::with('category')->forYear($year);
        if ($month !== null) {
            $query = LedgerEntry::with('category')->forMonth($year, $month);
        }
        $entries = $query->orderBy('entry_date')->orderBy('sort_order')->orderBy('id')->get();

        $filename = $month
            ? sprintf('ledger-%04d-%02d.csv', $year, $month)
            : sprintf('ledger-%04d.csv', $year);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return response()->streamDownload(function () use ($entries) {
            $out = fopen('php://output', 'w');
            // BOM for Excel UTF-8 compatibility
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Date', 'Type', 'Bucket', 'Amount', 'Description', 'Category', 'Notes', 'Source']);
            foreach ($entries as $e) {
                fputcsv($out, [
                    $e->entry_date->format('Y-m-d'),
                    $e->type,
                    $e->bucket,
                    number_format((float) $e->amount, 2, '.', ''),
                    $e->description,
                    optional($e->category)->name,
                    $e->notes,
                    $e->source,
                ]);
            }
            fclose($out);
        }, $filename, $headers);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatEntry(LedgerEntry $e): array
    {
        return [
            'id' => $e->id,
            'entry_date' => $e->entry_date?->format('Y-m-d'),
            'entry_date_display' => $e->entry_date?->format('d.m.Y'),
            'type' => $e->type,
            'bucket' => $e->bucket,
            'amount' => (float) $e->amount,
            'description' => $e->description,
            'category' => $e->category ? ['id' => $e->category->id, 'name' => $e->category->name] : null,
            'member' => $e->member ? ['id' => $e->member->id, 'name' => $e->member->name] : null,
            'notes' => $e->notes,
            'source' => $e->source,
            'deleted_at' => $e->deleted_at?->format('Y-m-d H:i'),
        ];
    }

    /**
     * Returns a closure: (normalizedDescription) -> ?int member_id.
     *
     * Match rules (in priority order, must yield exactly one member):
     *   1. exact match against the member's full name
     *   2. exact match against the first word of the member's name
     *   3. description appears as a whole word inside the member's name
     *
     * Loaded once per import to avoid N+1.
     */
    private function buildMemberMatcher(): \Closure
    {
        $members = Member::where('is_active', true)->get(['id', 'name'])->all();

        $byFullName = [];
        $byFirstWord = [];
        $allNormalized = []; // [normalized_full => [id, ...]]

        foreach ($members as $m) {
            $full = $this->normalizeMatch($m->name);
            $allNormalized[$full][] = $m->id;
            $byFullName[$full][] = $m->id;
            $words = preg_split('/\s+/', $full);
            $first = $words[0] ?? '';
            if ($first !== '') {
                $byFirstWord[$first][] = $m->id;
            }
        }

        return function (?string $normalized) use ($byFullName, $byFirstWord, $members) {
            if ($normalized === null || $normalized === '') return null;
            $key = $this->normalizeMatch($normalized);
            if ($key === '') return null;

            if (isset($byFullName[$key]) && count($byFullName[$key]) === 1) {
                return $byFullName[$key][0];
            }
            if (isset($byFirstWord[$key]) && count($byFirstWord[$key]) === 1) {
                return $byFirstWord[$key][0];
            }

            // Whole-word substring match — only useful if it's unambiguous.
            $hits = [];
            foreach ($members as $m) {
                $full = $this->normalizeMatch($m->name);
                $words = preg_split('/\s+/', $full);
                if (in_array($key, $words, true)) {
                    $hits[] = $m->id;
                }
            }
            return count($hits) === 1 ? $hits[0] : null;
        };
    }

    private function ensureCategory(string $name, string $kind): int
    {
        $normalized = LedgerCategory::normalize($name);
        $cat = LedgerCategory::firstOrCreate(
            ['normalized_name' => $normalized],
            ['name' => $name, 'kind' => $kind, 'is_active' => true, 'sort_order' => 0]
        );
        return $cat->id;
    }

    private function normalizeMatch(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/\s+/u', ' ', $value);
        $value = preg_replace('/[^\p{L}\p{N} ]+/u', '', $value);
        return trim($value);
    }

    private function yearFromLabel(string $label, int $fallback): int
    {
        if (preg_match('/(\d{4})/', $label, $m)) {
            $y = (int) $m[1];
            if ($y >= 2000 && $y <= 2100) return $y;
        }
        $serbianMonths = ['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'];
        $hasMonth = false;
        $lower = mb_strtolower($label);
        foreach ($serbianMonths as $m) {
            if (str_contains($lower, $m) || str_contains($lower, substr($m, 0, 3))) {
                $hasMonth = true;
                break;
            }
        }
        return $fallback;
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
}
