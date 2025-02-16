<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use App\Models\MembershipCategory;

class MemberController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $filter = $request->query('filter', '');

        if ($filter === 'active') {
            $members = Member::where('is_active', 1)->get();
        } else {
            $members = Member::all();
        }

        return view('members.index', compact('members', 'filter'));
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        $categories = MembershipCategory::all();
        return view('members.create', compact('categories'));
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
            $filename = Str::slug($request->name) . '-' . $data['membership_number'] . '.' . $file->getClientOriginalExtension();

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
        $member = Member::findOrFail($id);
        return view('members.show', compact('member'));
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
        return view('members.edit', compact('member', 'categories'));
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
            'membership_number' => 'required|string|max:50',
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
            $filename = Str::slug($request->name) . '-' . $data['membership_number'] . '.' . $file->getClientOriginalExtension();

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
