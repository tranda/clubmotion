<?php
// filepath: /d:/Projects/motion/club.motion.rs/clubmotion/routes/web.php
use Illuminate\Support\Facades\Route;
use App\Models\Member;
use App\Http\Controllers\MemberController;

Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/members', function () {
    $filter = request('filter', 'active'); // Get the filter from the query string

    $query = Member::with('category'); // Start the query

    if ($filter === 'active') {
        $members = Member::with('category')->where('is_active', true)->get();
    } else {
        $members = Member::with('category')->get();
    }

//    $members = $query->get(); // Execute the query

    return view('members.index', compact('members', 'filter'));
})->name('members.index');

Route::get('/members/{id}', [MemberController::class, 'show'])->name('members.show');

Route::get('/payments', function () {
    // Add logic to display payments
})->name('payments.index');