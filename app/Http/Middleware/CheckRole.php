<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        if (!Auth::check()) {
            return redirect('login');
        }

        $userRole = Auth::user()->role ? Auth::user()->role->name : null;

        if ($userRole && in_array($userRole, $roles)) {
            return $next($request);
        }

        abort(403, 'Unauthorized access');
    }
}