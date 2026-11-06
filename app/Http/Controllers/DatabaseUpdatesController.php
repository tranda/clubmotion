<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

// Settings → App settings → Database updates (admins only): lists database migrations that are
// in the code but not yet run on this server, and runs them like
// `php artisan migrate` from the hosting panel.
class DatabaseUpdatesController extends Controller
{
    public function index()
    {
        return Inertia::render('Settings/App', [
            'database' => $this->migrationStatus() + ['output' => session('migrateOutput')],
        ]);
    }

    public function run()
    {
        @set_time_limit(300);

        try {
            $code = Artisan::call('migrate', ['--force' => true]);
            $output = trim(Artisan::output());
        } catch (\Throwable $e) {
            report($e);
            return redirect()->route('settings.app')
                ->with('error', 'Database update failed: ' . $e->getMessage())
                ->with('migrateOutput', trim(Artisan::output()) ?: null);
        }

        return redirect()->route('settings.app')
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

            return ['pending' => $pending, 'error' => null];
        } catch (\Throwable $e) {
            return ['pending' => [], 'error' => $e->getMessage()];
        }
    }
}
