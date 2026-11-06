<?php

namespace App\Http\Controllers;

use App\Models\AdminNote;
use App\Models\AdminNoteFile;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

// Staff notebook: rich-text notes with pasted images and attachments.
// Files are kept on the private local disk (storage/app/notes) and are only
// served through filesShow(), behind the admin/superuser route middleware.
class AdminNoteController extends Controller
{
    // Images that browsers may show inline. SVG is left out on purpose (it can carry scripts).
    private const INLINE_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    private const MAX_IMAGE_KB = 10240;       // 10 MB
    private const MAX_ATTACHMENT_KB = 51200;  // 50 MB

    // ─── Pages ───────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $search = trim((string) $request->input('q', ''));
        $memberId = $request->input('member_id');

        $query = AdminNote::with(['member', 'updater'])->withCount('attachments');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                  ->orWhere('body_text', 'like', '%' . $search . '%');
            });
        }
        if (is_numeric($memberId)) {
            $query->where('member_id', $memberId);
        }

        $notes = $query->orderByDesc('updated_at')->orderByDesc('id')->get()
            ->map(fn (AdminNote $n) => $this->formatListItem($n));

        return Inertia::render('Notes/Index', [
            'notes' => $notes,
            'members' => $this->memberOptions(),
            'filters' => [
                'q' => $search,
                'member_id' => is_numeric($memberId) ? (string) $memberId : '',
            ],
            'deletedCount' => AdminNote::onlyTrashed()->count(),
        ]);
    }

    public function create(Request $request)
    {
        $memberId = $request->input('member_id');

        return Inertia::render('Notes/Edit', [
            'note' => null,
            'members' => $this->memberOptions(),
            'defaultMemberId' => is_numeric($memberId) ? (string) $memberId : '',
            'limits' => $this->limits(),
        ]);
    }

    public function edit(AdminNote $note)
    {
        $note->load(['member', 'creator', 'updater', 'attachments']);

        return Inertia::render('Notes/Edit', [
            'note' => [
                'id' => $note->id,
                'title' => $note->title,
                'body' => $note->body ? json_decode($note->body, true) : null,
                'member_id' => $note->member_id ? (string) $note->member_id : '',
                'attachments' => $note->attachments->sortBy('id')->values()->map->toClient(),
                'created_by' => $note->creator?->name,
                'created_at' => $note->created_at?->format('d.m.Y H:i'),
                'updated_by' => $note->updater?->name,
                'updated_at' => $note->updated_at?->format('d.m.Y H:i'),
            ],
            'members' => $this->memberOptions(),
            'defaultMemberId' => '',
            'limits' => $this->limits(),
        ]);
    }

    public function deleted()
    {
        $notes = AdminNote::onlyTrashed()->with(['member', 'deleter'])->withCount('attachments')
            ->orderByDesc('deleted_at')->get()
            ->map(fn (AdminNote $n) => $this->formatListItem($n) + [
                'deleted_at' => $n->deleted_at?->format('d.m.Y H:i'),
                'deleted_by' => $n->deleter?->name,
            ]);

        return Inertia::render('Notes/Deleted', ['notes' => $notes]);
    }

    // ─── Note CRUD ───────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $this->validateNote($request);

        $note = AdminNote::create([
            'title' => $data['title'],
            'body' => $data['body'],
            'body_text' => $data['body_text'],
            'member_id' => $data['member_id'],
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);
        $this->syncFiles($note, $data['body'], $data['attachment_ids']);

        return redirect()->route('notes.edit', $note)->with('success', 'Note saved.');
    }

    public function update(Request $request, AdminNote $note)
    {
        $data = $this->validateNote($request);

        $note->fill([
            'title' => $data['title'],
            'body' => $data['body'],
            'body_text' => $data['body_text'],
            'member_id' => $data['member_id'],
        ]);
        $note->updated_by = auth()->id();
        $note->save();
        $this->syncFiles($note, $data['body'], $data['attachment_ids']);

        return redirect()->route('notes.edit', $note)->with('success', 'Note saved.');
    }

    public function destroy(AdminNote $note)
    {
        $note->deleted_by = auth()->id();
        $note->save();
        $note->delete();

        return redirect()->route('notes.index')->with('success', 'Note deleted.');
    }

    public function restore(int $id)
    {
        $note = AdminNote::onlyTrashed()->findOrFail($id);
        $note->restore();
        $note->deleted_by = null;
        $note->save();

        return redirect()->back()->with('success', 'Note restored.');
    }

    // ─── Files ───────────────────────────────────────────────────────────────

    // Called by the editor right away when an image is pasted/dropped or a file is
    // attached. The file is linked to its note when the note is saved.
    public function filesStore(Request $request)
    {
        $kind = $request->input('kind') === AdminNoteFile::KIND_IMAGE
            ? AdminNoteFile::KIND_IMAGE
            : AdminNoteFile::KIND_ATTACHMENT;

        $rules = $kind === AdminNoteFile::KIND_IMAGE
            ? ['required', 'file', 'mimetypes:' . implode(',', self::INLINE_IMAGE_MIMES), 'max:' . self::MAX_IMAGE_KB]
            : ['required', 'file', 'max:' . self::MAX_ATTACHMENT_KB];
        $request->validate(['file' => $rules]);

        $this->pruneOrphans();

        $upload = $request->file('file');
        $ext = strtolower($upload->getClientOriginalExtension() ?: $upload->extension() ?: 'bin');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'bin';
        $path = $upload->storeAs('notes/' . now()->format('Y/m'), Str::random(40) . '.' . $ext, AdminNoteFile::DISK);
        if (!$path) {
            return response()->json(['message' => 'The file could not be saved on the server.'], 500);
        }

        $file = AdminNoteFile::create([
            'kind' => $kind,
            'original_name' => Str::limit($upload->getClientOriginalName() ?: 'file.' . $ext, 250, ''),
            'path' => $path,
            'mime' => $upload->getMimeType(),
            'size' => $upload->getSize() ?: 0,
            'uploaded_by' => auth()->id(),
        ]);

        return response()->json($file->toClient());
    }

    public function filesShow(Request $request, AdminNoteFile $file)
    {
        $disk = Storage::disk(AdminNoteFile::DISK);
        abort_unless($disk->exists($file->path), 404);

        $inline = in_array($file->mime, self::INLINE_IMAGE_MIMES, true) || $file->mime === 'application/pdf';
        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=86400',
        ];
        // Lock down anything opened directly in the browser. Not for PDFs: the
        // browser's PDF viewer does not open under a sandbox policy.
        if ($file->mime !== 'application/pdf') {
            $headers['Content-Security-Policy'] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
        }

        if ($inline && !$request->boolean('download')) {
            return response()->file($disk->path($file->path), $headers + [
                'Content-Type' => $file->mime,
                'Content-Disposition' => 'inline; filename="' . $this->asciiName($file->original_name) . '"',
            ]);
        }

        return $disk->download($file->path, $file->original_name, $headers);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function validateNote(Request $request): array
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'body' => 'nullable|string|max:2000000',
            'body_text' => 'nullable|string|max:200000',
            'member_id' => 'nullable|exists:members,id',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer',
        ]);

        $body = $data['body'] ?? null;
        if ($body !== null && $body !== '') {
            $decoded = json_decode($body, true);
            if (!is_array($decoded) || ($decoded['type'] ?? null) !== 'doc') {
                abort(422, 'Invalid note content.');
            }
        } else {
            $body = null;
        }

        return [
            'title' => trim($data['title']),
            'body' => $body,
            'body_text' => isset($data['body_text']) ? trim($data['body_text']) : null,
            'member_id' => $data['member_id'] ?? null,
            'attachment_ids' => array_map('intval', $data['attachment_ids'] ?? []),
        ];
    }

    // Link the images used in the text and the kept attachments to this note;
    // delete this note's files that are no longer used.
    private function syncFiles(AdminNote $note, ?string $body, array $attachmentIds): void
    {
        $imageIds = $body ? $this->imageIds(json_decode($body, true)) : [];
        $keep = array_values(array_unique(array_merge($imageIds, $attachmentIds)));

        if ($keep) {
            AdminNoteFile::whereIn('id', $keep)
                ->where(fn ($q) => $q->whereNull('admin_note_id')->orWhere('admin_note_id', $note->id))
                ->update(['admin_note_id' => $note->id]);
        }

        // Delete one by one so the model event removes the stored file too.
        AdminNoteFile::where('admin_note_id', $note->id)
            ->whereNotIn('id', $keep ?: [0])
            ->get()
            ->each->delete();
    }

    // Ids of uploaded files used by image nodes anywhere in the editor document.
    private function imageIds($node): array
    {
        if (!is_array($node)) return [];
        $ids = [];
        if (($node['type'] ?? null) === 'image'
            && preg_match('#^/notes/files/(\d+)$#', (string) ($node['attrs']['src'] ?? ''), $m)) {
            $ids[] = (int) $m[1];
        }
        foreach ($node['content'] ?? [] as $child) {
            array_push($ids, ...$this->imageIds($child));
        }
        return $ids;
    }

    // Uploads that never got saved into a note (editor closed without saving).
    private function pruneOrphans(): void
    {
        AdminNoteFile::whereNull('admin_note_id')
            ->where('created_at', '<', now()->subDays(2))
            ->limit(50)
            ->get()
            ->each->delete();
    }

    private function formatListItem(AdminNote $n): array
    {
        return [
            'id' => $n->id,
            'title' => $n->title,
            'preview' => Str::limit(preg_replace('/\s+/u', ' ', (string) $n->body_text), 220),
            'member' => $n->member ? ['id' => $n->member->id, 'name' => $n->member->name] : null,
            'attachments_count' => $n->attachments_count ?? 0,
            'updated_by' => $n->updater?->name,
            'updated_at' => $n->updated_at?->format('d.m.Y H:i'),
        ];
    }

    private function memberOptions()
    {
        return Member::orderBy('name')->get(['id', 'name', 'is_active'])
            ->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'is_active' => (bool) $m->is_active]);
    }

    private function limits(): array
    {
        // The server's PHP upload limit can be lower than ours; report the smaller one.
        $php = $this->iniBytes(ini_get('upload_max_filesize'));
        $post = $this->iniBytes(ini_get('post_max_size'));
        $server = min(array_filter([$php, $post]) ?: [PHP_INT_MAX]);

        return [
            'image_bytes' => min(self::MAX_IMAGE_KB * 1024, $server),
            'attachment_bytes' => min(self::MAX_ATTACHMENT_KB * 1024, $server),
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
