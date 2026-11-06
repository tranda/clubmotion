<?php

namespace App\Http\Controllers;

use App\Models\ToolSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ToolsController extends Controller
{
    private const DISTANCES = [200, 500, 1000, 2000];

    private const DEFAULT_COEFS = [
        'tail' => 0.02,
        'head' => 0.03,
        'side' => 0.01,
    ];

    public function index()
    {
        return Inertia::render('Tools/Index', [
            'coefs' => $this->loadCoefs(),
        ]);
    }

    public function updateCoefs(Request $request)
    {
        $validated = $request->validate([
            'coefs'        => 'required|array',
            'coefs.*.tail' => 'required|numeric|min:0|max:1',
            'coefs.*.head' => 'required|numeric|min:0|max:1',
            'coefs.*.side' => 'required|numeric|min:0|max:1',
        ]);

        foreach (self::DISTANCES as $d) {
            $key = (string) $d;
            if (!isset($validated['coefs'][$key])) {
                continue;
            }
            $c = $validated['coefs'][$key];
            ToolSetting::set("wind_coef_{$d}_tail", (string) $c['tail'], "Wind coef for {$d}m: tailwind (subtracts)");
            ToolSetting::set("wind_coef_{$d}_head", (string) $c['head'], "Wind coef for {$d}m: headwind (adds)");
            ToolSetting::set("wind_coef_{$d}_side", (string) $c['side'], "Wind coef for {$d}m: side (adds)");
        }

        return back()->with('success', 'Koeficijenti vetra sačuvani.');
    }

    private function loadCoefs(): array
    {
        $result = [];
        foreach (self::DISTANCES as $d) {
            $result[(string) $d] = [
                'tail' => (float) ToolSetting::get("wind_coef_{$d}_tail", self::DEFAULT_COEFS['tail']),
                'head' => (float) ToolSetting::get("wind_coef_{$d}_head", self::DEFAULT_COEFS['head']),
                'side' => (float) ToolSetting::get("wind_coef_{$d}_side", self::DEFAULT_COEFS['side']),
            ];
        }
        return $result;
    }
}
