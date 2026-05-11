<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Note;
use App\Models\NoteCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NoteController extends Controller
{
    // ─── Index ───────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $memberFilter = array_values(array_filter(
            (array) $request->input('member_id', []),
            fn ($v) => is_numeric($v)
        ));
        $categoryFilter = array_values(array_filter(
            (array) $request->input('category_id', []),
            fn ($v) => is_numeric($v)
        ));

        $query = Note::with(['category', 'member']);

        if (!empty($memberFilter)) {
            $query->whereIn('member_id', $memberFilter);
        }
        if (!empty($categoryFilter)) {
            $query->whereIn('note_category_id', $categoryFilter);
        }

        $entries = $query
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($n) => $this->formatEntry($n));

        $totalAmount = (float) $query->sum('amount');

        return Inertia::render('Notes/Index', [
            'entries' => $entries,
            'totalAmount' => $totalAmount,
            'categories' => NoteCategory::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'is_active']),
            'members' => Member::where('is_active', true)->orderBy('name')->get(['id', 'name', 'membership_number']),
            'filters' => [
                'member_id' => array_map(fn ($id) => (string) $id, $memberFilter),
                'category_id' => array_map(fn ($id) => (string) $id, $categoryFilter),
            ],
            'deletedCount' => Note::onlyTrashed()->count(),
        ]);
    }

    public function deletedEntries()
    {
        $entries = Note::onlyTrashed()
            ->with(['category', 'member', 'deleter'])
            ->orderByDesc('deleted_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($n) => $this->formatEntry($n));

        return Inertia::render('Notes/Deleted', [
            'entries' => $entries,
        ]);
    }

    // ─── Entry CRUD ──────────────────────────────────────────────────────────

    public function storeEntry(Request $request)
    {
        $data = $this->validateEntry($request);

        Note::create(array_merge($data, [
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]));

        return redirect()->back()->with('success', 'Note added.');
    }

    public function updateEntry(Request $request, Note $note)
    {
        $data = $this->validateEntry($request);

        $note->fill($data);
        $note->updated_by = auth()->id();
        $note->save();

        return redirect()->back()->with('success', 'Note updated.');
    }

    public function destroyEntry(Note $note)
    {
        $note->deleted_by = auth()->id();
        $note->save();
        $note->delete();

        return redirect()->back()->with('success', 'Note deleted.');
    }

    public function restoreEntry(int $id)
    {
        $note = Note::onlyTrashed()->findOrFail($id);
        $note->restore();
        $note->deleted_by = null;
        $note->save();

        return redirect()->back()->with('success', 'Note restored.');
    }

    private function validateEntry(Request $request): array
    {
        return $request->validate([
            'entry_date' => 'required|date',
            'member_id' => 'required|exists:members,id',
            'note_category_id' => 'required|exists:note_categories,id',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:500',
        ]);
    }

    // ─── Category CRUD ───────────────────────────────────────────────────────

    public function categoriesIndex()
    {
        return Inertia::render('Notes/Categories', [
            'categories' => NoteCategory::withCount('notes')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function categoriesStore(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $normalized = NoteCategory::normalize($data['name']);
        if (NoteCategory::where('normalized_name', $normalized)->exists()) {
            return redirect()->back()->with('error', 'A category with this name already exists.');
        }

        NoteCategory::create([
            'name' => trim($data['name']),
            'normalized_name' => $normalized,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return redirect()->route('notes.categories.index')->with('success', 'Category created.');
    }

    public function categoriesUpdate(Request $request, NoteCategory $category)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $normalized = NoteCategory::normalize($data['name']);
        $exists = NoteCategory::where('normalized_name', $normalized)
            ->where('id', '!=', $category->id)
            ->exists();
        if ($exists) {
            return redirect()->back()->with('error', 'Another category already uses this name.');
        }

        $category->update([
            'name' => trim($data['name']),
            'normalized_name' => $normalized,
            'is_active' => $data['is_active'] ?? $category->is_active,
            'sort_order' => $data['sort_order'] ?? $category->sort_order,
        ]);

        return redirect()->route('notes.categories.index')->with('success', 'Category updated.');
    }

    public function categoriesDestroy(NoteCategory $category)
    {
        $category->delete();
        return redirect()->route('notes.categories.index')->with('success', 'Category deleted.');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatEntry(Note $n): array
    {
        return [
            'id' => $n->id,
            'entry_date' => $n->entry_date?->format('Y-m-d'),
            'entry_date_display' => $n->entry_date?->format('d.m.Y'),
            'amount' => (float) $n->amount,
            'description' => $n->description,
            'category' => $n->category ? ['id' => $n->category->id, 'name' => $n->category->name] : null,
            'member' => $n->member ? ['id' => $n->member->id, 'name' => $n->member->name] : null,
            'deleted_at' => $n->deleted_at?->format('Y-m-d H:i'),
        ];
    }
}
