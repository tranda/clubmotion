<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Models\Member;
use App\Models\MemberImage;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use App\Models\MembershipCategory;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClubMessage;
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
            $members = Member::with(['category', 'user.role'])->where('is_active', 1)->orderBy('membership_number')->get();
        } else {
            // 'all' or any other value shows all members
            $members = Member::with(['category', 'user.role'])->orderBy('membership_number')->get();
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
        $imageWarning = $this->guardImageUpload($request);

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

        $data = $request->except('image');

        // Auto-generate membership number (highest existing number + 1)
        $maxMembershipNumber = Member::max('membership_number');
        $data['membership_number'] = $maxMembershipNumber ? $maxMembershipNumber + 1 : 1;

        // Create member first
        $member = Member::create($data);

        // Store the image (if any) and record it in the member's image history.
        if ($request->hasFile('image')) {
            $this->storeMemberImage($member, $request->file('image'), auth()->id());
        }

        // Auto-calculate and assign category based on age (if birth date provided and category is age-based)
        if ($member->date_of_birth) {
            $calculatedCategoryId = $member->calculateCategory();
            if ($calculatedCategoryId && $calculatedCategoryId !== $member->category_id) {
                $member->category_id = $calculatedCategoryId;
                $member->save();
            }
        }

        $redirect = redirect()->route('members.index')->with('success', 'Member added successfully.');
        if ($imageWarning) {
            $redirect->with('error', $imageWarning);
        }
        return $redirect;
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

        // Get all payments for current year (all 12 months)
        $currentYear = date('Y');
        $existingPayments = $member->paymentsForYear($currentYear)
            ->orderBy('payment_month', 'asc')
            ->get()
            ->keyBy('payment_month');

        // Build full 12-month array, filling missing months with pending status
        $allPayments = [];
        for ($month = 1; $month <= 12; $month++) {
            if ($existingPayments->has($month)) {
                $allPayments[] = $existingPayments->get($month);
            } else {
                $allPayments[] = (object) [
                    'id' => null,
                    'payment_month' => $month,
                    'paid_amount' => null,
                    'payment_status' => 'pending',
                    'payment_date' => null,
                ];
            }
        }

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

        // Photo history (for revert/delete) — admin/superuser only.
        $imageHistory = [];
        if ($user->isAdmin() || $user->isSuperuser()) {
            $imageHistory = MemberImage::where('member_id', $member->id)
                ->with('uploader:id,name')
                ->orderBy('id', 'desc')
                ->get();
        }

        return Inertia::render('Members/Show', [
            'member' => $member,
            'recentPayments' => $allPayments,
            'currentYear' => $currentYear,
            'imageHistory' => $imageHistory,
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
        $member->load('user.role');

        return Inertia::render('Members/Edit', [
            'member' => $member,
            'categories' => $categories,
            'roles' => Role::orderBy('id')->get(['id', 'name']),
            'linkedUser' => $member->user ? [
                'id' => $member->user->id,
                'role_id' => $member->user->role_id,
                'role_name' => $member->user->role?->name,
            ] : null,
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
        $imageWarning = $this->guardImageUpload($request);

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

        $member->update($data);

        // Store the new image (if any) and record it in the member's image history.
        // The previous file is kept so it can be reverted to later.
        if ($request->hasFile('image')) {
            $this->storeMemberImage($member, $request->file('image'), auth()->id());
        }

        // Optional role update — admin only, member must have a linked user account.
        if ($request->has('role_id') && auth()->user()->isAdmin()) {
            $request->validate([
                'role_id' => 'nullable|exists:roles,id',
            ]);

            if ($member->user) {
                $newRoleId = $request->input('role_id') ?: null;
                $isSelf = (int) $member->user->id === (int) auth()->id();
                if ($isSelf && (int) $newRoleId !== (int) $member->user->role_id) {
                    return back()->with('error', 'You cannot change your own role.');
                }
                $member->user->update(['role_id' => $newRoleId]);
            }
        }

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

        $redirect = redirect()->route('members.show', $member)->with('success', 'Member updated successfully.');
        if ($imageWarning) {
            $redirect->with('error', $imageWarning);
        }
        return $redirect;
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

    public function resetPassword(Request $request, Member $member)
    {
        $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!$member->email) {
            return back()->with('error', 'Cannot reset password: member has no email address on file.');
        }

        $user = $member->user;

        if (!$user) {
            $userRole = Role::where('name', 'user')->first();
            $user = User::create([
                'name' => $member->name,
                'email' => $member->email,
                'password' => Hash::make($request->password),
                'role_id' => $userRole?->id,
            ]);
            $member->user_id = $user->id;
            $member->save();
        } else {
            $user->password = Hash::make($request->password);
            $user->save();
        }

        return back()->with('success', "Password reset for {$member->name}. Share it with the member securely.");
    }

    /**
     * Send a message (email) to a member.
     */
    public function sendEmail(Request $request, Member $member)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:5000',
        ]);

        if (!$member->email) {
            return back()->with('error', 'Cannot send message: member has no email address on file.');
        }

        try {
            Mail::to($member->email)->send(
                new ClubMessage($validated['subject'], $validated['body'])
            );
        } catch (\Throwable $e) {
            Log::error('Failed to send member email', [
                'member_id' => $member->id,
                'error' => $e->getMessage(),
            ]);
            return back()->with('error', 'Email could not be sent. Check the mail configuration on the server.');
        }

        return back()->with('success', 'Message sent to ' . $member->email . '.');
    }

    /**
     * Store an uploaded image for a member, keeping the previous file and
     * recording the change in the member's image history.
     */
    private function storeMemberImage(Member $member, $file, ?int $uploadedBy): string
    {
        // Backfill: if the member already has a photo that isn't tracked yet,
        // record it first so admins can revert back to it after this upload.
        if ($member->image && !MemberImage::where('member_id', $member->id)->where('path', $member->image)->exists()) {
            MemberImage::create([
                'member_id' => $member->id,
                'path' => $member->image,
                'uploaded_by' => null,
            ]);
        }

        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = Str::slug($member->name) . '-' . $member->membership_number . '-' . Str::random(8) . '.' . $ext;
        $path = $file->storeAs('members', $filename, 'public');

        $member->image = $path;
        $member->save();

        MemberImage::create([
            'member_id' => $member->id,
            'path' => $path,
            'uploaded_by' => $uploadedBy,
        ]);

        $this->pruneMemberImages($member);

        return $path;
    }

    /**
     * Keep only the most recent images per member (history cap). Older files are
     * removed from disk and history — except the currently-active photo, which is
     * never deleted (it may be an older one that was reverted to).
     */
    private function pruneMemberImages(Member $member, int $keep = 5): void
    {
        $images = MemberImage::where('member_id', $member->id)
            ->orderBy('id', 'desc')
            ->get();

        if ($images->count() <= $keep) {
            return;
        }

        foreach ($images->slice($keep) as $old) {
            if ($old->path === $member->image) {
                continue; // never delete the active photo
            }
            Storage::disk('public')->delete($old->path);
            $old->delete();
        }
    }

    /**
     * Update a member's photo. Allowed for admins/superusers and for the
     * member themselves (self-service). Applies instantly; history is kept.
     */
    public function updateImage(Request $request, Member $member)
    {
        $user = auth()->user();
        $isOwner = $user->member && (int) $user->member->id === (int) $member->id;

        if (!$user->isAdmin() && !$user->isSuperuser() && !$isOwner) {
            abort(403, 'Unauthorized to change this photo.');
        }

        $imageWarning = $this->guardImageUpload($request);

        $request->validate([
            'image' => 'required|image|mimes:jpg,png,jpeg|max:2048',
        ]);

        $this->storeMemberImage($member, $request->file('image'), $user->id);

        $redirect = back()->with('success', 'Photo updated.');
        if ($imageWarning) {
            $redirect->with('error', $imageWarning);
        }
        return $redirect;
    }

    /**
     * Revert a member's current photo to a previous one from history. Admin/superuser only.
     */
    public function revertImage(Member $member, MemberImage $image)
    {
        $user = auth()->user();
        if (!$user->isAdmin() && !$user->isSuperuser()) {
            abort(403);
        }
        if ((int) $image->member_id !== (int) $member->id) {
            abort(404);
        }

        $member->image = $image->path;
        $member->save();

        return back()->with('success', 'Reverted to the selected photo.');
    }

    /**
     * Permanently delete a photo from a member's history (e.g. an inappropriate
     * upload). Admin/superuser only. If it was the current photo, falls back to
     * the most recent remaining one.
     */
    public function deleteImage(Member $member, MemberImage $image)
    {
        $user = auth()->user();
        if (!$user->isAdmin() && !$user->isSuperuser()) {
            abort(403);
        }
        if ((int) $image->member_id !== (int) $member->id) {
            abort(404);
        }

        $wasCurrent = $member->image === $image->path;

        Storage::disk('public')->delete($image->path);
        $image->delete();

        if ($wasCurrent) {
            $latest = MemberImage::where('member_id', $member->id)->latest('id')->first();
            $member->image = $latest?->path;
            $member->save();
        }

        return back()->with('success', 'Photo deleted.');
    }

    private function guardImageUpload(Request $request): ?string
    {
        $file = $_FILES['image'] ?? null;
        if (!$file) {
            return null;
        }

        $error = $file['error'] ?? UPLOAD_ERR_OK;
        if ($error === UPLOAD_ERR_OK || $error === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $iniMax = ini_get('upload_max_filesize') ?: 'unknown';
        $postMax = ini_get('post_max_size') ?: 'unknown';

        $message = match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "Image was not saved: file exceeds the server limit of {$iniMax}. Member details were saved without the new image.",
            UPLOAD_ERR_PARTIAL => 'Image was not saved: upload was interrupted. Member details were saved without the new image.',
            UPLOAD_ERR_NO_TMP_DIR => 'Image was not saved: server is missing a temporary upload directory. Member details were saved without the new image.',
            UPLOAD_ERR_CANT_WRITE => 'Image was not saved: server could not write it to disk. Member details were saved without the new image.',
            UPLOAD_ERR_EXTENSION => 'Image was not saved: a PHP extension blocked the upload. Member details were saved without the new image.',
            default => "Image was not saved (upload error code {$error}). Member details were saved without the new image.",
        };

        Log::warning('Member image upload failed', [
            'php_error_code' => $error,
            'upload_max_filesize' => $iniMax,
            'post_max_size' => $postMax,
            'original_name' => $file['name'] ?? null,
            'reported_size' => $file['size'] ?? null,
        ]);

        unset($_FILES['image']);
        $request->files->remove('image');
        $request->request->remove('image');

        return $message;
    }
}
