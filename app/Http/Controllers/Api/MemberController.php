<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    /**
     * Display a listing of all members or only active members.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = Member::query();

        if ($request->has('active')) {
            $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $members = $query->paginate(15); // Adjust pagination as needed

        return response()->json(MemberResource::collection($members)->response()->getData(true));
    }

    /**
     * Display the specified member.
     *
     * @param Member $member
     * @return JsonResponse
     */
    public function show(Member $member): JsonResponse
    {
        return response()->json(new MemberResource($member));
    }

    /**
     * Store a newly created member in storage.
     *
     * @param StoreMemberRequest $request
     * @return JsonResponse
     */
    public function store(StoreMemberRequest $request): JsonResponse
    {
        $validatedData = $request->validated();

        // Hash the password if provided
        if (isset($validatedData['password'])) {
            $validatedData['password_hash'] = Hash::make($validatedData['password']);
            unset($validatedData['password']); // Remove the plain text password
        }

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $path = $request->file('profile_image')->store('members', 'public');
            $validatedData['profile_image_url'] = Storage::url($path);
        }

        $member = Member::create($validatedData);

        return response()->json(new MemberResource($member), 201);
    }

    /**
     * Update the specified member in storage.
     *
     * @param UpdateMemberRequest $request
     * @param Member $member
     * @return JsonResponse
     */
    public function update(UpdateMemberRequest $request, Member $member): JsonResponse
    {
        $validatedData = $request->validated();

        // Hash the password if a new one is provided
        if (isset($validatedData['password'])) {
            $validatedData['password_hash'] = Hash::make($validatedData['password']);
            unset($validatedData['password']); // Remove the plain text password
        }

        // Handle profile image update
        if ($request->hasFile('profile_image')) {
            // Delete the old image if it exists
            if ($member->profile_image_url) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $member->profile_image_url));
            }
            $path = $request->file('profile_image')->store('members', 'public');
            $validatedData['profile_image_url'] = Storage::url($path);
        }

        $member->update($validatedData);

        return response()->json(new MemberResource($member));
    }

    /**
     * Remove the specified member from storage.
     *
     * @param Member $member
     * @return JsonResponse
     */
    public function destroy(Member $member): JsonResponse
    {
        // Delete the profile image if it exists
        if ($member->profile_image_url) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $member->profile_image_url));
        }

        $member->delete();

        return response()->json(null, 204);
    }
}