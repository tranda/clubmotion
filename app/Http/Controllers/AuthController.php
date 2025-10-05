<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    /**
     * Show the login form
     */
    public function showLogin()
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle login request
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            // Check if the user's associated member is inactive
            $user = Auth::user();
            if ($user->member && !$user->member->is_active) {
                Auth::logout();
                throw ValidationException::withMessages([
                    'email' => 'Your account is inactive. Please contact the club administrator.',
                ]);
            }

            $request->session()->regenerate();

            return redirect('/');
        }

        // Check if user exists
        $user = \App\Models\User::where('email', $request->email)->first();

        if (!$user) {
            // User doesn't exist - check if there's a member with this email
            $member = \App\Models\Member::where('email', $request->email)->first();

            if ($member) {
                // Check if member is inactive
                if (!$member->is_active) {
                    throw ValidationException::withMessages([
                        'email' => 'Your account is inactive. Please contact the club administrator.',
                    ]);
                }

                // Member exists but no user account - create user with the password they entered
                // Find the 'user' role (regular member role)
                $userRole = \App\Models\Role::where('name', 'user')->first();

                $newUser = \App\Models\User::create([
                    'name' => $member->name,
                    'email' => $member->email,
                    'password' => Hash::make($request->password),
                    'role_id' => $userRole ? $userRole->id : null,
                ]);

                // Link member to user
                $member->user_id = $newUser->id;
                $member->save();

                // Log them in immediately
                Auth::login($newUser, $request->boolean('remember'));
                $request->session()->regenerate();

                return redirect('/');
            }

            throw ValidationException::withMessages([
                'email' => 'No account found with this email address.',
            ]);
        }

        throw ValidationException::withMessages([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    /**
     * Handle logout request
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Force a full page reload to get fresh CSRF token
        return Inertia::location('/login');
    }

    /**
     * Show forgot password form
     */
    public function showForgotPassword()
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle forgot password request
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Show reset password form
     */
    public function showResetPassword(Request $request, $token)
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->email,
        ]);
    }

    /**
     * Handle reset password request
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status == Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}
