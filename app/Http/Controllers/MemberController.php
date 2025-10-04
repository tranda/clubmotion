<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Member;
use Illuminate\Http\Request;
use App\Models\MembershipCategory;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class MemberController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        // Only default to 'active' if filter is not present in query at all
        $filter = $request->has('filter') ? $request->query('filter') : 'active';

        if ($filter === 'active') {
            $members = Member::with('category')->where('is_active', 1)->orderBy('membership_number')->get();
        } else {
            // 'all' or any other value shows all members
            $members = Member::with('category')->orderBy('membership_number')->get();
        }

        // Calculate and update category for each member if needed
        $members = $members->map(function ($member) {
            if ($member->date_of_birth) {
                $calculatedCategoryId = $member->calculateCategory();

                // Update if: 1) category is null, OR 2) current category is age-based and has changed
                if ($calculatedCategoryId) {
                    $shouldUpdate = false;

                    if (!$member->category_id) {
                        // No category set, assign the calculated one
                        $shouldUpdate = true;
                    } else {
                        $currentCategory = MembershipCategory::find($member->category_id);
                        // Only update if current category is age-based and has changed
                        if ($currentCategory && $currentCategory->is_age_based && $calculatedCategoryId !== $member->category_id) {
                            $shouldUpdate = true;
                        }
                    }

                    if ($shouldUpdate) {
                        $member->category_id = $calculatedCategoryId;
                        $member->save();
                        $member->load('category'); // Reload the category relationship
                    }
                }
            }
            return $member;
        });

        // Calculate category statistics
        $allCategories = MembershipCategory::all();
        $categoryStats = [];

        // Initialize all categories with count 0 and min_age/max_age for sorting
        foreach ($allCategories as $category) {
            $categoryStats[$category->id] = [
                'name' => $category->category_name,
                'count' => 0,
                'min_age' => $category->min_age ?? 999, // Use 999 for non-age-based categories to sort them last
                'max_age' => $category->max_age ?? 999,
            ];
        }

        // Count members by category
        foreach ($members as $member) {
            if ($member->category_id && isset($categoryStats[$member->category_id])) {
                $categoryStats[$member->category_id]['count']++;
            }
        }

        // Convert to array and sort by min_age then max_age
        $categoryStats = array_values($categoryStats);
        usort($categoryStats, function($a, $b) {
            // First sort by min_age
            $minCompare = $a['min_age'] <=> $b['min_age'];
            if ($minCompare !== 0) {
                return $minCompare;
            }
            // If min_age is same, sort by max_age
            return $a['max_age'] <=> $b['max_age'];
        });

        return Inertia::render('Members/Index', [
            'members' => $members,
            'filter' => $filter,
            'categoryStats' => $categoryStats,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        $categories = MembershipCategory::all();
        return Inertia::render('Members/Create', [
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'date_of_birth' => 'nullable|date',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'category_id' => 'nullable|exists:membership_categories,id',
            'medical_validity' => 'nullable|date',
            'is_active' => 'boolean',
            'image' => 'nullable|image|mimes:jpg,png,jpeg|max:2048',
        ]);

        $data = $request->all();

        // Auto-generate membership number (highest existing number + 1)
        $maxMembershipNumber = Member::max('membership_number');
        $data['membership_number'] = $maxMembershipNumber ? $maxMembershipNumber + 1 : 1;

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            // Generate a custom filename: "member_name-timestamp.extension"
            $filename = Str::slug($request->name) . '-' . $request->membership_number . '.' . $file->getClientOriginalExtension();

            // Store the file
            $imagePath = $file->storeAs('members', $filename, 'public');
            $data['image'] = $imagePath;
        }

        // Create member first
        $member = Member::create($data);

        // Auto-calculate and assign category based on age (if birth date provided and category is age-based)
        if ($member->date_of_birth) {
            $calculatedCategoryId = $member->calculateCategory();
            if ($calculatedCategoryId && $calculatedCategoryId !== $member->category_id) {
                $member->category_id = $calculatedCategoryId;
                $member->save();
            }
        }

        return redirect()->route('members.index')->with('success', 'Member added successfully.');
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $member = Member::with('category')->findOrFail($id);
        $user = auth()->user();

        // Regular users can only see their own profile
        if (!$user->isAdmin() && !$user->isSuperuser()) {
            if (!$user->member || $user->member->id != $member->id) {
                abort(403, 'Unauthorized to view this member');
            }
        }

        // Get recent payments (last 6 months)
        $currentYear = date('Y');
        $recentPayments = $member->paymentsForYear($currentYear)
            ->orderBy('payment_month', 'desc')
            ->limit(6)
            ->get();

        // Calculate and update category if needed
        if ($member->date_of_birth) {
            $calculatedCategoryId = $member->calculateCategory();

            // Update if: 1) category is null, OR 2) current category is age-based and has changed
            if ($calculatedCategoryId) {
                $shouldUpdate = false;

                if (!$member->category_id) {
                    // No category set, assign the calculated one
                    $shouldUpdate = true;
                } else {
                    $currentCategory = MembershipCategory::find($member->category_id);
                    // Only update if current category is age-based and has changed
                    if ($currentCategory && $currentCategory->is_age_based && $calculatedCategoryId !== $member->category_id) {
                        $shouldUpdate = true;
                    }
                }

                if ($shouldUpdate) {
                    $member->category_id = $calculatedCategoryId;
                    $member->save();
                    $member->load('category'); // Reload the category relationship
                }
            }
        }

        return Inertia::render('Members/Show', [
            'member' => $member,
            'recentPayments' => $recentPayments,
            'currentYear' => $currentYear,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit(Member $member)
    {
        $categories = MembershipCategory::all();
        return Inertia::render('Members/Edit', [
            'member' => $member,
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Member $member)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'membership_number' => 'required|integer',
            'date_of_birth' => 'nullable|date',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'category_id' => 'nullable|exists:membership_categories,id',
            'medical_validity' => 'nullable|date',
            'is_active' => 'required|boolean',
            'image' => 'nullable|image|mimes:jpg,png,jpeg|max:2048',
        ]);

        $data = $request->except('image');

        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($member->image) {
                Storage::disk('public')->delete($member->image);
            }

            $file = $request->file('image');

            // Generate a custom filename: "member_name-timestamp.extension"
            $filename = Str::slug($request->name) . '-' . $request->membership_number . '.' . $file->getClientOriginalExtension();

            // Store the file
            $imagePath = $file->storeAs('members', $filename, 'public');
            $data['image'] = $imagePath;
        }

        $member->update($data);

        // Recalculate category if birth date changed and category is age-based
        if ($member->date_of_birth) {
            $calculatedCategoryId = $member->calculateCategory();
            $currentCategory = MembershipCategory::find($member->category_id);

            // Only auto-update if current category is age-based
            if ($currentCategory && $currentCategory->is_age_based && $calculatedCategoryId !== $member->category_id) {
                $member->category_id = $calculatedCategoryId;
                $member->save();
            }
        }

        return redirect()->route('members.show', $member)->with('success', 'Member updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(Member $member)
    {
        $member->delete();

        return redirect()->route('members.index')->with('success', 'Member deleted successfully.');
    }
}
