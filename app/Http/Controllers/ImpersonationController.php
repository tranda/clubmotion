<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * "View as member": lets an admin browse the app as a member's user account.
 * The original admin id is kept in the session; while it is set the
 * BlockWritesWhileImpersonating middleware makes the app read-only.
 */
class ImpersonationController extends Controller
{
    public const SESSION_KEY = 'impersonator_id';

    public function start(Request $request, Member $member)
    {
        $admin = $request->user();

        if ($request->session()->has(self::SESSION_KEY)) {
            return back()->with('error', 'Already viewing as another member. Return to admin first.');
        }

        $target = $member->user;

        if (!$target) {
            return back()->with('error', 'This member has no login account.');
        }

        if ($target->id === $admin->id || $target->isAdmin()) {
            return back()->with('error', 'Cannot view as an admin account.');
        }

        Log::info('Impersonation started', [
            'admin_id' => $admin->id,
            'admin_email' => $admin->email,
            'target_user_id' => $target->id,
            'member_id' => $member->id,
        ]);

        Auth::login($target);
        $request->session()->put(self::SESSION_KEY, $admin->id);

        return redirect('/')->with('success', "Now viewing as {$member->name}. Changes are disabled.");
    }

    public function stop(Request $request)
    {
        $adminId = $request->session()->pull(self::SESSION_KEY);
        $admin = $adminId ? User::find($adminId) : null;

        if (!$admin) {
            return redirect('/');
        }

        $viewed = $request->user();

        Log::info('Impersonation stopped', [
            'admin_id' => $admin->id,
            'target_user_id' => $viewed?->id,
        ]);

        Auth::login($admin);

        $member = $viewed?->member;

        return $member
            ? redirect()->route('members.show', $member->id)
            : redirect('/');
    }
}
