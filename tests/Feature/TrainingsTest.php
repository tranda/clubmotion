<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Training;
use App\Models\TrainingFile;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TrainingsTest extends TestCase
{
    // The app's full migration history is MySQL-only, so build just the tables
    // these pages use on in-memory SQLite, then run the Trainings migration itself.
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        \DB::purge('sqlite');

        Schema::create('roles', function (Blueprint $t) { $t->id(); $t->string('name')->unique(); $t->string('description')->nullable(); $t->timestamps(); });
        Schema::create('users', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('email')->unique(); $t->timestamp('email_verified_at')->nullable();
            $t->string('password'); $t->rememberToken(); $t->foreignId('role_id')->nullable(); $t->timestamps();
        });
        Schema::create('members', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('membership_number')->nullable(); $t->boolean('is_active')->default(true);
            $t->foreignId('user_id')->nullable(); $t->timestamps();
        });
        Schema::create('join_requests', function (Blueprint $t) { $t->id(); $t->string('status')->nullable(); $t->timestamps(); });
        (require database_path('migrations/2026_11_15_120000_create_trainings_tables.php'))->up();

        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
    }

    private function userWithRole(string $role): User
    {
        $r = Role::firstOrCreate(['name' => $role]);
        return User::factory()->create(['role_id' => $r->id]);
    }

    public function test_members_can_read_but_not_manage(): void
    {
        $user = $this->userWithRole('user');
        $t = Training::create(['type' => 'gym', 'title' => 'Legs', 'training_date' => now()->addDay()->toDateString()]);

        $this->actingAs($user)->get('/trainings?view=list')->assertOk()
            ->assertInertia(fn ($p) => $p->component('Trainings/Index')->where('upcoming.0.title', 'Legs'));
        $this->actingAs($user)->get('/trainings/' . $t->id)->assertOk();

        $this->actingAs($user)->get('/trainings/create')->assertForbidden();
        $this->actingAs($user)->post('/trainings', ['type' => 'gym', 'title' => 'X'])->assertForbidden();
        $this->actingAs($user)->delete('/trainings/' . $t->id)->assertForbidden();
    }

    public function test_staff_upload_flow_and_member_can_open_file(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('superuser');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'water',
            'title' => '8x500m',
            'training_date' => now()->toDateString(),
            'description' => "Warm-up 2km\nMain set",
            'files' => [
                UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf'),
                UploadedFile::fake()->image('board.png', 20, 20),
            ],
        ])->assertRedirect();

        $training = Training::firstOrFail();
        $this->assertCount(2, $training->files);
        $pdf = $training->files->firstWhere('original_name', 'plan.pdf');
        Storage::disk('local')->assertExists($pdf->path);

        $member = $this->userWithRole('user');
        $this->actingAs($member)->get('/trainings/files/' . $pdf->id)->assertOk();

        // Remove one file and add another on update.
        $png = $training->files->firstWhere('original_name', 'board.png');
        $this->actingAs($admin)->post('/trainings/' . $training->id, [
            '_method' => 'put',
            'type' => 'gym',
            'title' => 'Changed',
            'remove_file_ids' => [$png->id],
            'files' => [UploadedFile::fake()->create('extra.xlsx', 10)],
        ])->assertRedirect('/trainings/' . $training->id);

        $training->refresh();
        $this->assertSame('gym', $training->type);
        $this->assertNull($training->training_date);
        $this->assertEqualsCanonicalizing(['plan.pdf', 'extra.xlsx'], $training->files->pluck('original_name')->all());
        Storage::disk('local')->assertMissing($png->path);

        // Deleted training hides its files from members.
        $this->actingAs($admin)->delete('/trainings/' . $training->id)->assertRedirect('/trainings');
        $this->actingAs($member)->get('/trainings/files/' . $pdf->id)->assertNotFound();
        $this->actingAs($member)->get('/trainings/' . $training->id)->assertNotFound();
    }

    public function test_rejects_disallowed_file_types(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'water',
            'title' => 'Bad',
            'files' => [UploadedFile::fake()->create('script.php', 1)],
        ])->assertSessionHasErrors('files.0');
        $this->assertSame(0, Training::count());
    }

    public function test_sections_split_by_date(): void
    {
        $user = $this->userWithRole('user');
        Training::create(['type' => 'water', 'title' => 'Past', 'training_date' => now()->subDays(3)->toDateString()]);
        Training::create(['type' => 'water', 'title' => 'Today', 'training_date' => now()->toDateString()]);
        Training::create(['type' => 'gym', 'title' => 'Program']);

        $this->actingAs($user)->get('/trainings?view=list&type=water')->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('upcoming.0.title', 'Today')
                ->where('past.0.title', 'Past')
                ->has('undated', 0));
        $this->actingAs($user)->get('/trainings')->assertOk()
            ->assertInertia(fn ($p) => $p->where('undated.0.title', 'Program'));
    }

    public function test_calendar_month_and_week_ranges(): void
    {
        $user = $this->userWithRole('user');
        // November 2026: grid runs Mon 26 Oct – Sun 6 Dec.
        Training::create(['type' => 'water', 'title' => 'Oct edge', 'training_date' => '2026-10-26']);
        Training::create(['type' => 'gym', 'title' => 'Mid', 'training_date' => '2026-11-18']);
        Training::create(['type' => 'water', 'title' => 'Dec edge', 'training_date' => '2026-12-06']);
        Training::create(['type' => 'water', 'title' => 'Outside', 'training_date' => '2026-12-07']);

        $this->actingAs($user)->get('/trainings?date=2026-11-15')->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('view', 'month')
                ->where('range.start', '2026-10-26')
                ->where('range.end', '2026-12-06')
                ->has('calendar', 3)
                ->where('calendar.0.title', 'Oct edge'));

        $this->actingAs($user)->get('/trainings?view=week&date=2026-11-18')->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('range.start', '2026-11-16')
                ->where('range.end', '2026-11-22')
                ->has('calendar', 1)
                ->where('calendar.0.title', 'Mid'));

        $this->actingAs($user)->get('/trainings?date=2026-11-15&type=water')->assertOk()
            ->assertInertia(fn ($p) => $p->has('calendar', 2));

        // Bad date falls back to today instead of failing.
        $this->actingAs($user)->get('/trainings?date=nope')->assertOk();
    }

    public function test_home_shows_next_training_per_type(): void
    {
        $user = $this->userWithRole('user');
        Training::create(['type' => 'water', 'title' => 'Old', 'training_date' => now()->subDay()->toDateString()]);
        Training::create(['type' => 'water', 'title' => 'Later water', 'training_date' => now()->addDays(5)->toDateString()]);
        Training::create(['type' => 'water', 'title' => 'Next water', 'training_date' => now()->addDays(2)->toDateString()]);
        Training::create(['type' => 'gym', 'title' => 'Gym today', 'training_date' => now()->toDateString()]);

        $this->actingAs($user)->get('/')->assertOk()
            ->assertInertia(fn ($p) => $p
                ->has('nextTrainings', 2)
                ->where('nextTrainings.0.title', 'Gym today')
                ->where('nextTrainings.1.title', 'Next water'));
    }

    public function test_create_prefills_date_from_calendar(): void
    {
        $this->actingAs($this->userWithRole('admin'))->get('/trainings/create?date=2026-11-20&type=gym')->assertOk()
            ->assertInertia(fn ($p) => $p->where('defaultDate', '2026-11-20')->where('defaultType', 'gym'));
    }
}
