<?php

namespace App\Http\Middleware;

use App\Http\Controllers\ImpersonationController;
use Closure;
use Illuminate\Http\Request;

/**
 * While an admin is viewing the app as a member, only reads are allowed —
 * apart from returning to admin and logging out.
 */
class BlockWritesWhileImpersonating
{
    public function handle(Request $request, Closure $next)
    {
        if (
            $request->session()->has(ImpersonationController::SESSION_KEY)
            && !$request->isMethodSafe()
            && !$request->routeIs('impersonate.stop', 'logout')
        ) {
            $message = 'Changes are disabled while viewing as a member.';

            if ($request->expectsJson() && !$request->header('X-Inertia')) {
                return response()->json(['message' => $message], 403);
            }

            return back()->with('error', $message);
        }

        return $next($request);
    }
}
