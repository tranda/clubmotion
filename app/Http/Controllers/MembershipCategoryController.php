<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\MembershipCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Membership categories (Settings → Member categories). Age-based ones are assigned
 * automatically from members' birth dates (Member::calculateCategory).
 */
class MembershipCategoryController extends Controller
{
    public function index()
    {
        $counts = Member::selectRaw('category_id, COUNT(*) as total, SUM(is_active = 1) as active')
            ->groupBy('category_id')
            ->get()
            ->keyBy('category_id');

        $categories = MembershipCategory::orderByRaw('min_age IS NULL, min_age, max_age, category_name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'category_name' => $c->category_name,
                'description' => $c->description,
                'is_age_based' => (bool) $c->is_age_based,
                'min_age' => $c->min_age,
                'max_age' => $c->max_age,
                'members' => (int) optional($counts->get($c->id))->total,
                'active_members' => (int) optional($counts->get($c->id))->active,
            ]);

        return Inertia::render('Settings/Categories', ['categories' => $categories]);
    }

    public function store(Request $request)
    {
        MembershipCategory::create($this->validated($request));

        return back()->with('success', 'Category added');
    }

    public function update(Request $request, MembershipCategory $category)
    {
        $category->update($this->validated($request));

        return back()->with('success', 'Category updated');
    }

    public function destroy(MembershipCategory $category)
    {
        // members.category_id cascades on delete, so never delete a category in use.
        $inUse = Member::where('category_id', $category->id)->count();
        if ($inUse > 0) {
            return back()->with('error', "Cannot delete: {$inUse} member(s) are in this category. Move them first.");
        }

        $category->delete();

        return back()->with('success', 'Category deleted');
    }

    private function validated(Request $request)
    {
        $data = $request->validate([
            'category_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_age_based' => 'boolean',
            'min_age' => 'nullable|integer|min:0|max:150',
            'max_age' => 'nullable|integer|min:0|max:150',
        ]);
        if (isset($data['min_age'], $data['max_age']) && $data['max_age'] < $data['min_age']) {
            throw \Illuminate\Validation\ValidationException::withMessages(['max_age' => 'Max age must be at least min age.']);
        }
        $data['is_age_based'] = $request->boolean('is_age_based');

        return $data;
    }
}
