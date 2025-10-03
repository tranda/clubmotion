<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MemberController;
use App\Models\Member;
use Inertia\Inertia;
use Carbon\Carbon;

Route::get('/', function () {
    $totalMembers = Member::count();
    $activeMembers = Member::where('is_active', true)->count();
    $newThisMonth = Member::whereMonth('created_at', Carbon::now()->month)
                          ->whereYear('created_at', Carbon::now()->year)
                          ->count();

    return Inertia::render('Home', [
        'stats' => [
            'totalMembers' => $totalMembers,
            'activeMembers' => $activeMembers,
            'newThisMonth' => $newThisMonth,
        ]
    ]);
})->name('home');

// Member routes
Route::get('/members', [MemberController::class, 'index'])->name('members.index');
Route::get('/members/create', [MemberController::class, 'create'])->name('members.create');
Route::post('/members', [MemberController::class, 'store'])->name('members.store');
Route::get('/members/{id}', [MemberController::class, 'show'])->name('members.show');
Route::get('/members/{member}/edit', [MemberController::class, 'edit'])->name('members.edit');
Route::put('/members/{member}', [MemberController::class, 'update'])->name('members.update');
Route::delete('/members/{member}', [MemberController::class, 'destroy'])->name('members.destroy');

Route::get('/payments', function () {
    return Inertia::render('Payments/Index');
})->name('payments.index');