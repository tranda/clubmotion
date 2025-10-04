<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AttendanceController;
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

    // Attendance - All users can view, Admin/Superuser can edit
    Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance.index');

    Route::middleware('role:admin,superuser')->group(function () {
        Route::get('/attendance/import', [AttendanceController::class, 'showImport'])->name('attendance.import');
        Route::post('/attendance/import', [AttendanceController::class, 'import'])->name('attendance.import.store');
        Route::post('/attendance/sessions', [AttendanceController::class, 'createSession'])->name('attendance.sessions.create');
        Route::put('/attendance/sessions/{id}', [AttendanceController::class, 'updateSession'])->name('attendance.sessions.update');
        Route::post('/attendance/mark', [AttendanceController::class, 'markAttendance'])->name('attendance.mark');
        Route::delete('/attendance/sessions/{id}', [AttendanceController::class, 'deleteSession'])->name('attendance.sessions.delete');
    });

    // Payments - My payments for all authenticated users
    Route::get('/my-payments', [App\Http\Controllers\PaymentController::class, 'myPayments'])
        ->name('payments.mine');

    // Admin & Superuser: Full payment management
    Route::middleware('role:admin,superuser')->group(function () {
        // Payment grid
        Route::get('/payments', [App\Http\Controllers\PaymentController::class, 'index'])
            ->name('payments.index');

        // Initialize year
        Route::get('/payments/initialize', [App\Http\Controllers\PaymentController::class, 'showInitialize'])
            ->name('payments.initialize');
        Route::post('/payments/initialize', [App\Http\Controllers\PaymentController::class, 'initialize'])
            ->name('payments.initialize.store');

        // Import/Export
        Route::get('/payments/import', [App\Http\Controllers\PaymentController::class, 'showImport'])
            ->name('payments.import');
        Route::post('/payments/import', [App\Http\Controllers\PaymentController::class, 'import'])
            ->name('payments.import.store');
        Route::get('/payments/export-template/{year}', [App\Http\Controllers\PaymentController::class, 'exportTemplate'])
            ->name('payments.export.template');

        // Member payment history
        Route::get('/payments/member/{member}', [App\Http\Controllers\PaymentController::class, 'memberHistory'])
            ->name('payments.member');

        // Store or update payment (using updateOrCreate)
        Route::post('/payments', [App\Http\Controllers\PaymentController::class, 'store'])
            ->name('payments.store');

        // Update payment
        Route::put('/payments/{payment}', [App\Http\Controllers\PaymentController::class, 'update'])
            ->name('payments.update');

        // Delete payment
        Route::delete('/payments/{payment}', [App\Http\Controllers\PaymentController::class, 'destroy'])
            ->name('payments.destroy');

        // Bulk actions
        Route::post('/payments/bulk-mark-paid', [App\Http\Controllers\PaymentController::class, 'bulkMarkPaid'])
            ->name('payments.bulk.paid');
    });

    // Migration runner - Admin only (remove after first use)
    Route::get('/migrate', function () {
        if (auth()->user()->role_id !== 1) {
            abort(403, 'Only admin can run migrations');
        }

        try {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $output = \Illuminate\Support\Facades\Artisan::output();
            return response('<pre>' . $output . '</pre><br><a href="/payments">Go to Payments</a>');
        } catch (\Exception $e) {
            return response('<h2>Migration Error:</h2><pre>' . $e->getMessage() . '</pre>', 500);
        }
    })->middleware('role:admin');
});