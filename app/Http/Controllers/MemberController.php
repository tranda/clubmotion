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
        $filter = $request->query('filter', 'active');

        if ($filter === 'active') {
            $members = Member::with('category')->where('is_active', 1)->orderBy('membership_number')->get();
        } else {
            $members = Member::with('category')->orderBy('membership_number')->get();
        }

        return Inertia::render('Members/Index', [
            'members' => $members,
            'filter' => $filter,
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
            'membership_number' => 'required|unique:members',
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

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            // Generate a custom filename: "member_name-timestamp.extension"
            $filename = Str::slug($request->name) . '-' . $request->membership_number . '.' . $file->getClientOriginalExtension();

            // Store the file
            $imagePath = $file->storeAs('members', $filename, 'public');
            $data['image'] = $imagePath;
        }

        Member::create($data);

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

        $data = $request->all();

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
