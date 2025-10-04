<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class AchievementsController extends Controller
{
    /**
     * Display user's achievements
     */
    public function index()
    {
        $user = auth()->user();

        // For now, just render the page
        // We'll add achievement data later when you share the sheet structure
        return Inertia::render('Achievements/Index', [
            'user' => $user,
        ]);
    }
}
