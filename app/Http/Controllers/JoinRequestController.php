<?php

namespace App\Http\Controllers;

use App\Mail\JoinRequestMessage;
use App\Models\JoinRequest;
use App\Models\Member;
use App\Models\MembershipCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class JoinRequestController extends Controller
{
    /**
     * Public "Join in" form.
     */
    public function create()
    {
        return Inertia::render('JoinRequest/Create', [
            'clubName' => env('CLUB_NAME', config('app.name')),
        ]);
    }

    /**
     * Store a public join request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'date_of_birth' => 'nullable|date|before:today',
            'message' => 'nullable|string|max:2000',
        ]);

        // Avoid duplicate open requests from the same email
        $existingOpen = JoinRequest::where('email', $validated['email'])
            ->whereIn('status', [JoinRequest::STATUS_PENDING, JoinRequest::STATUS_PROCESSING])
            ->exists();

        if ($existingOpen) {
            return back()->with('success', 'We already have your request on file and will be in touch shortly.');
        }

        JoinRequest::create(array_merge($validated, [
            'status' => JoinRequest::STATUS_PENDING,
        ]));

        return back()->with('success', 'Thank you! Your request has been received. We will be in touch shortly.');
    }

    /**
     * Admin listing of join requests.
     */
    public function index(Request $request)
    {
        $filter = $request->query('status', 'open');

        $query = JoinRequest::with(['member', 'resolver'])->latest();

        if ($filter === 'open') {
            $query->whereIn('status', [JoinRequest::STATUS_PENDING, JoinRequest::STATUS_PROCESSING]);
        } elseif (in_array($filter, JoinRequest::STATUSES, true)) {
            $query->where('status', $filter);
        }
        // 'all' -> no additional constraint

        $requests = $query->get();

        $counts = [
            'pending' => JoinRequest::where('status', JoinRequest::STATUS_PENDING)->count(),
            'processing' => JoinRequest::where('status', JoinRequest::STATUS_PROCESSING)->count(),
            'approved' => JoinRequest::where('status', JoinRequest::STATUS_APPROVED)->count(),
            'rejected' => JoinRequest::where('status', JoinRequest::STATUS_REJECTED)->count(),
        ];

        return Inertia::render('JoinRequests/Index', [
            'requests' => $requests,
            'filter' => $filter,
            'counts' => $counts,
        ]);
    }

    /**
     * Update the status of a request (e.g. mark processing or rejected).
     */
    public function updateStatus(Request $request, JoinRequest $joinRequest)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(JoinRequest::STATUSES)],
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        // Approving is done via the dedicated approve() action so a member gets created.
        if ($validated['status'] === JoinRequest::STATUS_APPROVED && !$joinRequest->member_id) {
            return back()->with('error', 'Use "Create account" to approve a request.');
        }

        $joinRequest->status = $validated['status'];
        if (array_key_exists('admin_notes', $validated)) {
            $joinRequest->admin_notes = $validated['admin_notes'];
        }

        if (in_array($validated['status'], [JoinRequest::STATUS_REJECTED, JoinRequest::STATUS_APPROVED], true)) {
            $joinRequest->resolved_by = auth()->id();
            $joinRequest->resolved_at = now();
        }

        $joinRequest->save();

        return back()->with('success', 'Request updated.');
    }

    /**
     * Approve a request: create a Member record and link it.
     */
    public function approve(Request $request, JoinRequest $joinRequest)
    {
        // Optional welcome email to send after creating the account.
        $validated = $request->validate([
            'subject' => 'nullable|string|max:255',
            'body' => 'nullable|string|max:5000',
        ]);
        $wantsEmail = !empty($validated['subject']) && !empty($validated['body']);

        if ($joinRequest->member_id) {
            return back()->with('error', 'A member has already been created for this request.');
        }

        // Email must be unique across members (they sign in with it).
        if (Member::where('email', $joinRequest->email)->exists()) {
            return back()->with('error', 'A member with this email already exists. Reject this request or update the member manually.');
        }

        // Resolve a category: age-based from DOB, else fall back to the first category
        // (members.category_id is NOT NULL). Admin can adjust later via member edit.
        $categoryId = null;
        if ($joinRequest->date_of_birth) {
            $probe = new Member(['date_of_birth' => $joinRequest->date_of_birth->format('Y-m-d')]);
            $categoryId = $probe->calculateCategory();
        }
        if (!$categoryId) {
            $categoryId = MembershipCategory::orderBy('id')->value('id');
        }

        if (!$categoryId) {
            return back()->with('error', 'No membership categories exist yet. Create a category before approving requests.');
        }

        $maxMembershipNumber = Member::max('membership_number');

        $member = Member::create([
            'name' => $joinRequest->name,
            'email' => $joinRequest->email,
            'date_of_birth' => $joinRequest->date_of_birth ? $joinRequest->date_of_birth->format('Y-m-d') : null,
            'category_id' => $categoryId,
            'membership_number' => $maxMembershipNumber ? $maxMembershipNumber + 1 : 1,
            'is_active' => true,
        ]);

        $joinRequest->member_id = $member->id;
        $joinRequest->status = JoinRequest::STATUS_APPROVED;
        $joinRequest->resolved_by = auth()->id();
        $joinRequest->resolved_at = now();

        // Optionally send the welcome email. Member creation is the primary action,
        // so a mail failure is reported but does not undo the approval.
        $emailMsg = '';
        if ($wantsEmail) {
            try {
                Mail::to($joinRequest->email)->send(
                    new JoinRequestMessage($validated['subject'], $validated['body'])
                );
                $joinRequest->last_emailed_at = now();
                $joinRequest->emails_sent = ($joinRequest->emails_sent ?? 0) + 1;
                $joinRequest->last_email_subject = $validated['subject'];
                $emailMsg = ' Welcome email sent.';
            } catch (\Throwable $e) {
                Log::error('Failed to send welcome email', [
                    'join_request_id' => $joinRequest->id,
                    'error' => $e->getMessage(),
                ]);
                $emailMsg = ' (Welcome email could not be sent — check mail configuration.)';
            }
        }

        $joinRequest->save();

        return back()->with('success', "Member #{$member->membership_number} created. They can activate their login by signing in with this email." . $emailMsg);
    }

    /**
     * Send a manual email to the applicant.
     */
    public function sendEmail(Request $request, JoinRequest $joinRequest)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:5000',
            // Optionally apply a status change together with the email (e.g. reject + notify).
            'set_status' => ['nullable', Rule::in([JoinRequest::STATUS_REJECTED, JoinRequest::STATUS_PROCESSING])],
        ]);

        $emailOk = true;
        try {
            Mail::to($joinRequest->email)->send(
                new JoinRequestMessage($validated['subject'], $validated['body'])
            );
        } catch (\Throwable $e) {
            Log::error('Failed to send join request email', [
                'join_request_id' => $joinRequest->id,
                'error' => $e->getMessage(),
            ]);
            $emailOk = false;
        }

        // A plain email (no status change) that fails is just an error — nothing to save.
        if ($emailOk === false && empty($validated['set_status'])) {
            return back()->with('error', 'Email could not be sent. Check the mail configuration on the server.');
        }

        // Record the email only if it actually went out.
        if ($emailOk) {
            $joinRequest->last_emailed_at = now();
            $joinRequest->emails_sent = ($joinRequest->emails_sent ?? 0) + 1;
            $joinRequest->last_email_subject = $validated['subject'];
        }

        // Apply the optional status change regardless of whether the email succeeded,
        // so the request still gets resolved even if mail is misconfigured.
        $statusMsg = '';
        if (!empty($validated['set_status'])) {
            $joinRequest->status = $validated['set_status'];
            if ($validated['set_status'] === JoinRequest::STATUS_REJECTED) {
                $joinRequest->resolved_by = auth()->id();
                $joinRequest->resolved_at = now();
                $statusMsg = 'Request rejected.';
            }
        }

        $joinRequest->save();

        if (!empty($validated['set_status'])) {
            $mailMsg = $emailOk
                ? ' Email sent to ' . $joinRequest->email . '.'
                : ' (Email could not be sent — check mail configuration.)';
            return back()->with('success', trim($statusMsg . $mailMsg));
        }

        return back()->with('success', 'Email sent to ' . $joinRequest->email . '.');
    }

    /**
     * Delete a request.
     */
    public function destroy(JoinRequest $joinRequest)
    {
        $joinRequest->delete();

        return back()->with('success', 'Request deleted.');
    }
}
