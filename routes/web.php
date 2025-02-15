<?php
// filepath: /d:/Projects/motion/club.motion.rs/clubmotion/routes/web.php
use Illuminate\Support\Facades\Route;
use App\Models\Member;

Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/members', function () {
    $members = Member::with('category')->get();
    return view('members.index', compact('members'));
})->name('members.index');

Route::get('/payments', function () {
    // Add logic to display payments
})->name('payments.index');