<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\AuthController;
use App\Models\Member;
use Inertia\Inertia;
use Carbon\Carbon;

// Guest routes (login, password reset)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/forgot-password', [AuthController::class, 'showForgotPassword'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email');
    Route::get('/reset-password/{token}', [AuthController::class, 'showResetPassword'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');
});

// Authenticated routes
Route::middleware('auth')->group(function () {
    // Logout
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Home - accessible to all authenticated users
    Route::get('/', function () {
        // Show real active members count to everyone
        $activeMembers = Member::where('is_active', true)->count();

        return Inertia::render('Home', [
            'stats' => [
                'activeMembers' => $activeMembers,
            ]
        ]);
    })->name('home');

    // My Profile - for regular users to see their own data
    Route::get('/my-profile', function () {
        $user = auth()->user();

        if (!$user->member) {
            abort(404, 'Member profile not found');
        }

        return redirect()->route('members.show', $user->member->id);
    })->name('profile');

    // Member routes - Admin and Superuser can view all, Users redirected to their profile
    Route::middleware('role:admin,superuser')->group(function () {
        Route::get('/members', [MemberController::class, 'index'])->name('members.index');
    });

    Route::get('/members/{id}', [MemberController::class, 'show'])->name('members.show');

    // Admin and Superuser only routes (create, edit, delete)
    Route::middleware('role:admin,superuser')->group(function () {
        Route::get('/members/create', [MemberController::class, 'create'])->name('members.create');
        Route::post('/members', [MemberController::class, 'store'])->name('members.store');
        Route::get('/members/{member}/edit', [MemberController::class, 'edit'])->name('members.edit');
        Route::put('/members/{member}', [MemberController::class, 'update'])->name('members.update');
        Route::delete('/members/{member}', [MemberController::class, 'destroy'])->name('members.destroy');
    });

    // Payments - accessible to all authenticated users
    Route::get('/payments', function () {
        return Inertia::render('Payments/Index');
    })->name('payments.index');
});