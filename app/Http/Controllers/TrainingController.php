<?php

namespace App\Http\Controllers;

use App\Models\Training;
use App\Models\TrainingFile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

// Trainings: water and gym training plans. Every logged-in member can read them and open
// the attached files; admins and superusers add, edit and delete them.
// Files are kept on the private local disk (storage/app/trainings) and are only served
// through fileShow(), behind the auth middleware.
class TrainingController extends Controller
{
    // Shown in the browser instead of downloaded. SVG is left out on purpose (it can carry scripts).
    private const INLINE_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    private const ALLOWED_EXTENSIONS = [
        'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'txt', 'csv',
        'mp4', 'mov', 'm4v',
    ];

    private const MAX_FILE_KB = 51200;  // 50 MB
    private const PAST_LIMIT = 20;

    // ─── Pages ───────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        // The page shows a notice instead of failing until the database update has run.
        if (!self::ready()) {
            return Inertia::render('Trainings/Index', ['notReady' => true]);
        }

        $type = in_array($request->input('type'), Training::TYPES, true) ? $request->input('type') : '';
        $view = in_array($request->input('view'), ['month', 'week', 'list'], true) ? $request->input('view') : 'month';
        $showOlder = $request->boolean('older');
        $today = now()->toDateString();

        $base = fn () => Training::query()
            ->withCount('files')
            ->when($type !== '', fn ($q) => $q->where('type', $type));
        $format = fn ($items) => $items->map(fn (Training $t) => $this->formatListItem($t))->values();

        $props = [
            'notReady' => false,
            'view' => $view,
            'filters' => ['type' => $type, 'older' => $showOlder],
        ];

        if ($view !== 'list') {
            // Calendar: whole weeks (Monday–Sunday) around the chosen month or week.
            $anchor = $this->parseDate($request->input('date')) ?? now()->startOfDay();
            if ($view === 'month') {
                $start = $anchor->copy()->startOfMonth()->startOfWeek(Carbon::MONDAY);
                $end = $anchor->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY);
            } else {
                $start = $anchor->copy()->startOfWeek(Carbon::MONDAY);
                $end = $anchor->copy()->endOfWeek(Carbon::SUNDAY);
            }

            $items = $base()
                ->whereDate('training_date', '>=', $start->toDateString())
                ->whereDate('training_date', '<=', $end->toDateString())
                ->orderBy('training_date')->orderBy('type')->orderBy('id')
                ->get();

            return Inertia::render('Trainings/Index', $props + [
                'calendar' => $format($items),
                'range' => [
                    'anchor' => $anchor->toDateString(),
                    'start' => $start->toDateString(),
                    'end' => $end->toDateString(),
                ],
            ]);
        }

        $upcoming = $base()->whereDate('training_date', '>=', $today)
            ->orderBy('training_date')->orderBy('id')->get();
        $pastQuery = $base()->whereDate('training_date', '<', $today);
        $pastTotal = (clone $pastQuery)->count();
        $past = $pastQuery->orderByDesc('training_date')->orderByDesc('id')
            ->when(!$showOlder, fn ($q) => $q->limit(self::PAST_LIMIT))
            ->get();

        return Inertia::render('Trainings/Index', $props + [
            'upcoming' => $format($upcoming),
            'past' => $format($past),
            'pastTotal' => $pastTotal,
        ]);
    }

    public function show(Training $training)
    {
        $training->load(['files', 'updater']);

        return Inertia::render('Trainings/Show', [
            'training' => $this->formatFull($training),
        ]);
    }


    public function create(Request $request)
    {
        $type = in_array($request->input('type'), Training::TYPES, true) ? $request->input('type') : Training::TYPE_WATER;

        return Inertia::render('Trainings/Edit', [
            'training' => null,
            'defaultType' => $type,
            'defaultDate' => $this->parseDate($request->input('date'))?->toDateString() ?? '',
            'limits' => $this->limits(),
        ]);
    }

    public function edit(Training $training)
    {
        $training->load(['files', 'updater']);

        return Inertia::render('Trainings/Edit', [
            'training' => $this->formatFull($training),
            'defaultType' => $training->type,
            'defaultDate' => '',
            'limits' => $this->limits(),
        ]);
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $this->validateTraining($request);

        $training = Training::create([
            'type' => $data['type'],
            'title' => $data['title'],
            'training_date' => $data['training_date'],
            'description' => $data['description'],
            'links' => $data['links'],
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);
        $this->storeFiles($training, array_merge($request->file('images', []), $request->file('files', [])));

        return redirect()->route('trainings.show', $training)->with('success', 'Training saved.');
    }

    public function update(Request $request, Training $training)
    {
        $data = $this->validateTraining($request);

        $training->fill([
            'type' => $data['type'],
            'title' => $data['title'],
            'training_date' => $data['training_date'],
            'description' => $data['description'],
            'links' => $data['links'],
        ]);
        $training->updated_by = auth()->id();
        $training->save();

        if ($data['remove_file_ids']) {
            // One by one so the model event removes the stored file too.
            $training->files()->whereIn('id', $data['remove_file_ids'])->get()->each->delete();
        }
        $this->storeFiles($training, array_merge($request->file('images', []), $request->file('files', [])));

        return redirect()->route('trainings.show', $training)->with('success', 'Training saved.');
    }

    public function destroy(Training $training)
    {
        $training->deleted_by = auth()->id();
        $training->save();
        $training->delete();

        return redirect()->route('trainings.index')->with('success', 'Training deleted.');
    }

    // ─── Import ──────────────────────────────────────────────────────────────
    //
    // Bulk import from a prepared file (trainings-import.json) plus its images and PDFs.
    // The page reads the file in the browser, shows what will be added, then sends one
    // training per request, so no single request goes over the server's upload limits.
    // A file used by many trainings (e.g. the whole plan PDF) is uploaded once and then
    // linked to the others with copy_file_ids.

    public function importPage()
    {
        return Inertia::render('Trainings/Import', [
            'notReady' => !self::ready(),
            'limits' => $this->limits(),
        ]);
    }

    // Which of the given trainings already exist (same type, date and title).
    public function importCheck(Request $request)
    {
        abort_unless(self::ready(), 409, 'Run the database updates first.');
        $data = $request->validate([
            'items' => 'required|array|max:2000',
            'items.*.type' => 'required|string',
            'items.*.date' => 'required|date_format:Y-m-d',
            'items.*.title' => 'required|string|max:200',
        ]);

        $dates = collect($data['items'])->pluck('date')->sort()->values();
        $existing = Training::whereDate('training_date', '>=', $dates->first())
            ->whereDate('training_date', '<=', $dates->last())
            ->get(['type', 'training_date', 'title'])
            ->map(fn ($t) => self::importKey($t->type, $t->training_date->toDateString(), $t->title))
            ->flip();

        return response()->json([
            'existing' => collect($data['items'])
                ->filter(fn ($i) => isset($existing[self::importKey($i['type'], $i['date'], $i['title'])]))
                ->map(fn ($i) => self::importKey($i['type'], $i['date'], $i['title']))
                ->values(),
        ]);
    }

    public function importItem(Request $request)
    {
        abort_unless(self::ready(), 409, 'Run the database updates first.');
        $data = $this->validateTraining($request);
        $copyIds = array_map('intval', $request->validate([
            'copy_file_ids' => 'nullable|array|max:20',
            'copy_file_ids.*' => 'integer',
        ])['copy_file_ids'] ?? []);

        // Running the same import twice does not create duplicates.
        $existing = Training::where('type', $data['type'])
            ->whereDate('training_date', $data['training_date'])
            ->where('title', $data['title'])
            ->first();
        if ($existing) {
            return response()->json(['id' => $existing->id, 'skipped' => true, 'files' => []]);
        }

        $training = Training::create([
            'type' => $data['type'],
            'title' => $data['title'],
            'training_date' => $data['training_date'],
            'description' => $data['description'],
            'links' => $data['links'],
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);
        $this->storeFiles($training, array_merge($request->file('images', []), $request->file('files', [])));

        // Link already uploaded files (same stored file, new row for this training).
        foreach (TrainingFile::whereIn('id', $copyIds)->get() as $file) {
            TrainingFile::create([
                'training_id' => $training->id,
                'original_name' => $file->original_name,
                'path' => $file->path,
                'mime' => $file->mime,
                'size' => $file->size,
                'uploaded_by' => auth()->id(),
            ]);
        }

        return response()->json([
            'id' => $training->id,
            'skipped' => false,
            'files' => $training->files()->get()->map(fn ($f) => ['id' => $f->id, 'name' => $f->original_name])->values(),
        ]);
    }

    private static function importKey(string $type, string $date, string $title): string
    {
        return $type . '|' . $date . '|' . mb_strtolower(trim($title));
    }

    // ─── Files ───────────────────────────────────────────────────────────────

    public function fileShow(Request $request, TrainingFile $file)
    {
        // Files of a deleted training are no longer shown to members.
        abort_unless($file->training()->exists(), 404);

        $disk = Storage::disk(TrainingFile::DISK);
        abort_unless($disk->exists($file->path), 404);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ];
        // Lock down anything opened directly in the browser. Not for PDFs: the
        // browser's PDF viewer does not open under a sandbox policy.
        if ($file->mime !== 'application/pdf') {
            $headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
        }

        if (in_array($file->mime, self::INLINE_MIMES, true) && !$request->boolean('download')) {
            return response()->file($disk->path($file->path), $headers + [
                'Content-Type' => $file->mime,
                'Content-Disposition' => 'inline; filename="' . $this->asciiName($file->original_name) . '"',
            ]);
        }

        return $disk->download($file->path, $file->original_name, $headers);
    }

    // Home page card: the next water and the next gym training (today or later).
    public static function nextByType(): array
    {
        if (!self::ready()) return [];

        $today = now()->toDateString();
        $next = [];
        foreach (Training::TYPES as $type) {
            $t = Training::withCount('files')
                ->where('type', $type)
                ->whereDate('training_date', '>=', $today)
                ->orderBy('training_date')->orderBy('id')
                ->first();
            if ($t) $next[] = (new self)->formatListItem($t);
        }
        usort($next, fn ($a, $b) => strcmp($a['date'], $b['date']));
        return $next;
    }

    // False until both Trainings database updates have run on this server.
    private static function ready(): bool
    {
        return Schema::hasTable('trainings') && Schema::hasColumn('trainings', 'links');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function validateTraining(Request $request): array
    {
        $data = $request->validate([
            'type' => 'required|in:' . implode(',', Training::TYPES),
            'title' => 'required|string|max:200',
            'training_date' => 'required|date',
            'description' => 'nullable|string|max:20000',
            'files' => 'nullable|array|max:20',
            'files.*' => [
                'file',
                'max:' . self::MAX_FILE_KB,
                function ($attribute, $value, $fail) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
                        $fail('"' . $value->getClientOriginalName() . '" is not an allowed file type.');
                    }
                },
            ],
            'images' => 'nullable|array|max:30',
            'images.*' => ['file', 'max:' . self::MAX_FILE_KB, 'mimes:jpg,jpeg,png,gif,webp'],
            'remove_file_ids' => 'nullable|array',
            'remove_file_ids.*' => 'integer',
            'links' => 'nullable|array|max:10',
            'links.*.url' => ['required', 'string', 'max:500', 'url', 'regex:#^https?://#i'],
            'links.*.label' => 'nullable|string|max:100',
        ], [
            'links.*.url.required' => 'Enter the video address or remove the empty link.',
            'links.*.url.url' => 'Enter a full address, e.g. https://youtu.be/…',
            'links.*.url.regex' => 'The address must start with http:// or https://.',
            'files.*.max' => 'Each file can be at most ' . (self::MAX_FILE_KB / 1024) . ' MB.',
            'files.*.uploaded' => 'A file could not be uploaded (it may be larger than the server allows).',
            'images.*.max' => 'Each image can be at most ' . (self::MAX_FILE_KB / 1024) . ' MB.',
            'images.*.mimes' => 'Images must be JPG, PNG, GIF or WebP.',
            'images.*.uploaded' => 'An image could not be uploaded (it may be larger than the server allows).',
        ]);

        $description = isset($data['description']) ? trim($data['description']) : '';

        return [
            'type' => $data['type'],
            'title' => trim($data['title']),
            'training_date' => $data['training_date'],
            'description' => $description !== '' ? $description : null,
            'remove_file_ids' => array_map('intval', $data['remove_file_ids'] ?? []),
            'links' => collect($data['links'] ?? [])
                ->map(fn ($l) => ['url' => trim($l['url']), 'label' => trim((string) ($l['label'] ?? '')) ?: null])
                ->values()->all() ?: null,
        ];
    }

    private function storeFiles(Training $training, $uploads): void
    {
        foreach ((array) $uploads as $upload) {
            if (!$upload || !$upload->isValid()) continue;

            $ext = strtolower($upload->getClientOriginalExtension() ?: 'bin');
            $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'bin';
            $path = $upload->storeAs('trainings/' . now()->format('Y/m'), Str::random(40) . '.' . $ext, TrainingFile::DISK);
            if (!$path) continue;

            TrainingFile::create([
                'training_id' => $training->id,
                'original_name' => Str::limit($upload->getClientOriginalName() ?: 'file.' . $ext, 250, ''),
                'path' => $path,
                'mime' => $upload->getMimeType(),
                'size' => $upload->getSize() ?: 0,
                'uploaded_by' => auth()->id(),
            ]);
        }
    }

    // "2026-11-15" → Carbon at midnight; anything else → null.
    private function parseDate($value): ?Carbon
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return null;
        try {
            return Carbon::createFromFormat('Y-m-d', $value)->startOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function formatListItem(Training $t): array
    {
        return [
            'id' => $t->id,
            'type' => $t->type,
            'title' => $t->title,
            'date' => $t->training_date?->toDateString(),
            'preview' => Str::limit(preg_replace('/\s+/u', ' ', (string) $t->description), 160),
            'files_count' => $t->files_count ?? 0,
            'links_count' => count($t->links ?? []),
        ];
    }

    private function formatFull(Training $t): array
    {
        return [
            'id' => $t->id,
            'type' => $t->type,
            'title' => $t->title,
            'date' => $t->training_date?->toDateString(),
            'description' => $t->description,
            'links' => $t->links ?? [],
            'files' => $t->files->map->toClient()->values(),
            'updated_by' => $t->updater?->name,
            'updated_at' => $t->updated_at?->format('d.m.Y H:i'),
        ];
    }

    private function limits(): array
    {
        // The server's PHP upload limits can be lower than ours; report the smaller ones.
        $file = $this->iniBytes(ini_get('upload_max_filesize'));
        $post = $this->iniBytes(ini_get('post_max_size'));

        return [
            'file_bytes' => min(array_filter([self::MAX_FILE_KB * 1024, $file, $post])),
            'total_bytes' => $post ?: null,
            'max_files' => (int) ini_get('max_file_uploads') ?: 20,
            'extensions' => self::ALLOWED_EXTENSIONS,
        ];
    }

    private function iniBytes($value): int
    {
        $value = trim((string) $value);
        if ($value === '') return 0;
        $num = (int) $value;
        return match (strtolower(substr($value, -1))) {
            'g' => $num * 1024 ** 3,
            'm' => $num * 1024 ** 2,
            'k' => $num * 1024,
            default => $num,
        };
    }

    private function asciiName(string $name): string
    {
        return str_replace(['"', '\\'], '', Str::ascii($name)) ?: 'file';
    }
}
