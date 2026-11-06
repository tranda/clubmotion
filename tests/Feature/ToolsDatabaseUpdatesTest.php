<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ToolsDatabaseUpdatesTest extends TestCase
{
    // Full migration history is MySQL-only; use a minimal SQLite schema and mark
    // every migration except the Notes one as already run.
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');

        Schema::create('roles', function (Blueprint $t) { $t->id(); $t->string('name')->unique(); $t->string('description')->nullable(); $t->timestamps(); });
        Schema::create('users', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('email')->unique(); $t->timestamp('email_verified_at')->nullable();
            $t->string('password'); $t->rememberToken(); $t->foreignId('role_id')->nullable(); $t->timestamps();
        });
        Schema::create('members', function (Blueprint $t) { $t->id(); $t->string('name'); $t->boolean('is_active')->default(true); $t->foreignId('user_id')->nullable(); $t->timestamps(); });
        Schema::create('join_requests', function (Blueprint $t) { $t->id(); $t->string('status')->nullable(); $t->timestamps(); });
        Schema::create('tool_settings', function (Blueprint $t) { $t->id(); $t->string('key')->unique(); $t->text('value')->nullable(); $t->string('description')->nullable(); $t->timestamps(); });
        Schema::create('migrations', function (Blueprint $t) { $t->increments('id'); $t->string('migration'); $t->integer('batch'); });

        foreach (glob(database_path('migrations/*.php')) as $file) {
            $name = basename($file, '.php');
            if ($name !== '2026_11_06_120000_create_admin_notes_tables') {
                DB::table('migrations')->insert(['migration' => $name, 'batch' => 1]);
            }
        }
    }

    private function userWithRole(string $role): User
    {
        $r = Role::firstOrCreate(['name' => $role]);
        return User::factory()->create(['role_id' => $r->id]);
    }

    public function test_admin_sees_pending_update_and_runs_it(): void
    {
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->get('/tools')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('dbUpdates.pending', ['2026_11_06_120000_create_admin_notes_tables'])
                ->where('dbUpdates.error', null));

        $this->actingAs($admin)->post('/tools/migrate')->assertRedirect('/tools')->assertSessionHas('success');
        $this->assertTrue(Schema::hasTable('admin_notes'));

        $this->actingAs($admin)->get('/tools')->assertOk()
            ->assertInertia(fn ($page) => $page->where('dbUpdates.pending', []));
    }

    public function test_superuser_cannot_see_or_run_updates(): void
    {
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
        $superuser = $this->userWithRole('superuser');

        $this->actingAs($superuser)->get('/tools')->assertOk()
            ->assertInertia(fn ($page) => $page->where('dbUpdates', null));
        $this->actingAs($superuser)->post('/tools/migrate')->assertForbidden();
        $this->assertFalse(Schema::hasTable('admin_notes'));
    }
}
