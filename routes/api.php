<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MemberController;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\CalendlyWebhook;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/


Route::get('/log-test', function () {
    Log::info('✅ Log test worked!');
    return 'Logged!';
});

Route::post('/calendly-webhook', [CalendlyWebhook::class, 'webhook']);



Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);

    Route::get('/members', [MemberController::class, 'index']);
    Route::get('/members/{member}', [MemberController::class, 'show']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::put('/members/{member}', [MemberController::class, 'update']);
    Route::delete('/members/{member}', [MemberController::class, 'destroy']);
});
