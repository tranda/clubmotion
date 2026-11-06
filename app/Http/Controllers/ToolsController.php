<?php

namespace App\Http\Controllers;

use App\Models\ToolSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
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
        $isAdmin = auth()->user()?->role?->name === 'admin';

        return Inertia::render('Tools/Index', [
            'coefs' => $this->loadCoefs(),
            // Database updates (migrations) - admins only.
            'dbUpdates' => $isAdmin ? $this->migrationStatus() + [
                'output' => session('migrateOutput'),
            ] : null,
        ]);
    }

    // Runs the database migrations that are in the code but not yet on this
    // server, like `php artisan migrate` from the hosting panel. Admin only.
    public function runMigrations()
    {
        @set_time_limit(300);

        try {
            $code = Artisan::call('migrate', ['--force' => true]);
            $output = trim(Artisan::output());
        } catch (\Throwable $e) {
            report($e);
            return redirect()->route('tools.index')
                ->with('error', 'Database update failed: ' . $e->getMessage())
                ->with('migrateOutput', trim(Artisan::output()) ?: null);
        }

        return redirect()->route('tools.index')
            ->with($code === 0 ? 'success' : 'error', $code === 0 ? 'Database updated.' : 'Database update finished with errors.')
            ->with('migrateOutput', $output ?: null);
    }

    private function migrationStatus(): array
    {
        try {
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles([database_path('migrations')]);
            $ran = $migrator->repositoryExists() ? $migrator->getRepository()->getRan() : [];
            $pending = array_values(array_diff(array_keys($files), $ran));
            sort($pending);

            return ['pending' => $pending, 'ranCount' => count($ran), 'error' => null];
        } catch (\Throwable $e) {
            return ['pending' => [], 'ranCount' => 0, 'error' => $e->getMessage()];
        }
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
