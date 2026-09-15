<?php

namespace App\Http\Middleware;

use App\Models\JoinRequest;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Defines the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function share(Request $request): array
    {
        // Read version from version.json
        $versionFile = base_path('version.json');
        $version = '0.0.0'; // Default fallback
        if (file_exists($versionFile)) {
            $versionData = json_decode(file_get_contents($versionFile), true);
            $version = $versionData['version'] ?? $version;
        }

        $user = $request->user();
        $canManage = $user && $user->role && in_array($user->role->name, ['admin', 'superuser'], true);

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ? [
                        'id' => $user->role->id,
                        'name' => $user->role->name,
                    ] : null,
                ] : null,
            ],
            // Count of open (pending/processing) join requests, for the admin nav badge.
            'pendingJoinRequests' => fn () => $canManage
                ? JoinRequest::whereIn('status', [JoinRequest::STATUS_PENDING, JoinRequest::STATUS_PROCESSING])->count()
                : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'appVersion' => $version,
            'clubName' => env('CLUB_NAME', 'ClubMotion'),
            // OneSignal Web Push app id (public) — used by the browser SDK to
            // identify the logged-in user. Null when push isn't configured.
            'onesignalAppId' => config('services.onesignal.app_id'),
            'csrf_token' => csrf_token(), // Share fresh CSRF token on every request
        ]);
    }
}
