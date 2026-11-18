<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\Role;
use App\Models\Training;
use App\Models\TrainingExercise;
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
        (require database_path('migrations/2026_11_15_130000_add_links_to_trainings.php'))->up();
        (require database_path('migrations/2026_11_15_140000_create_exercises_tables.php'))->up();

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
            'training_date' => '2026-12-01',
            'remove_file_ids' => [$png->id],
            'files' => [UploadedFile::fake()->create('extra.xlsx', 10)],
        ])->assertRedirect('/trainings/' . $training->id);

        $training->refresh();
        $this->assertSame('gym', $training->type);
        $this->assertSame('2026-12-01', $training->training_date->toDateString());
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
            'training_date' => '2026-12-01',
            'files' => [UploadedFile::fake()->create('script.php', 1)],
        ])->assertSessionHasErrors('files.0');
        $this->assertSame(0, Training::count());
    }

    public function test_sections_split_by_date(): void
    {
        $user = $this->userWithRole('user');
        Training::create(['type' => 'water', 'title' => 'Past', 'training_date' => now()->subDays(3)->toDateString()]);
        Training::create(['type' => 'water', 'title' => 'Today', 'training_date' => now()->toDateString()]);

        $this->actingAs($user)->get('/trainings?view=list&type=water')->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('upcoming.0.title', 'Today')
                ->where('past.0.title', 'Past'));
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

    public function test_date_is_required_and_video_links_are_saved(): void
    {
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->post('/trainings', ['type' => 'water', 'title' => 'No date'])
            ->assertSessionHasErrors('training_date');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'water',
            'title' => 'Bad link',
            'training_date' => '2026-12-01',
            'links' => [['url' => 'javascript:alert(1)', 'label' => '']],
        ])->assertSessionHasErrors('links.0.url');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'water',
            'title' => 'Technique',
            'training_date' => '2026-12-01',
            'links' => [
                ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'label' => 'Catch phase'],
                ['url' => 'https://example.com/video.mp4', 'label' => ''],
            ],
        ])->assertRedirect();

        $t = Training::where('title', 'Technique')->firstOrFail();
        $this->assertSame([
            ['url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'label' => 'Catch phase'],
            ['url' => 'https://example.com/video.mp4', 'label' => null],
        ], $t->links);

        $member = $this->userWithRole('user');
        $this->actingAs($member)->get('/trainings/' . $t->id)->assertOk()
            ->assertInertia(fn ($p) => $p->where('training.links.0.label', 'Catch phase'));
        $this->actingAs($member)->get('/trainings?view=list')->assertOk()
            ->assertInertia(fn ($p) => $p->where('upcoming.0.links_count', 2));
    }

    public function test_page_waits_for_database_update(): void
    {
        Schema::table('trainings', fn (Blueprint $t) => $t->dropColumn('links'));
        $this->actingAs($this->userWithRole('user'))->get('/trainings')->assertOk()
            ->assertInertia(fn ($p) => $p->where('notReady', true));
        $this->actingAs($this->userWithRole('user'))->get('/')->assertOk()
            ->assertInertia(fn ($p) => $p->where('nextTrainings', []));
    }

    public function test_images_are_uploaded_separately_and_must_be_images(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'gym',
            'title' => 'Not an image',
            'training_date' => '2026-12-01',
            'images' => [UploadedFile::fake()->create('plan.pdf', 10, 'application/pdf')],
        ])->assertSessionHasErrors('images.0');

        $this->actingAs($admin)->post('/trainings', [
            'type' => 'gym',
            'title' => 'With images',
            'training_date' => '2026-12-01',
            'images' => [UploadedFile::fake()->image('a.jpg', 30, 30), UploadedFile::fake()->image('b.png', 30, 30)],
            'files' => [UploadedFile::fake()->create('plan.pdf', 10, 'application/pdf')],
        ])->assertRedirect();

        $t = Training::where('title', 'With images')->firstOrFail();
        $this->assertEqualsCanonicalizing(['a.jpg', 'b.png', 'plan.pdf'], $t->files->pluck('original_name')->all());
        $this->assertSame(2, $t->files->filter(fn ($f) => str_starts_with($f->mime, 'image/'))->count());
    }

    public function test_import_check_and_items_share_uploaded_files(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');
        Training::create(['type' => 'water', 'title' => 'Aerobno', 'training_date' => '2026-11-08']);

        $this->actingAs($this->userWithRole('user'))->get('/trainings/import')->assertForbidden();
        $this->actingAs($admin)->get('/trainings/import')->assertOk()
            ->assertInertia(fn ($p) => $p->component('Trainings/Import')->where('notReady', false));

        $this->actingAs($admin)->postJson('/trainings/import/check', ['items' => [
            ['type' => 'water', 'date' => '2026-11-08', 'title' => 'aerobno '],
            ['type' => 'gym', 'date' => '2026-11-10', 'title' => 'A2'],
        ]])->assertOk()->assertJson(['existing' => ['water|2026-11-08|aerobno']]);

        // First item uploads the shared plan PDF and its page image.
        $first = $this->actingAs($admin)->post('/trainings/import/item', [
            'type' => 'gym', 'title' => 'A1 | povlačenja', 'training_date' => '2026-11-03', 'description' => "Laka\n1. Veslanje",
            'images' => [UploadedFile::fake()->image('Teretana 2026-11-03 A1.jpg', 30, 30)],
            'files' => [UploadedFile::fake()->create('plan.pdf', 50, 'application/pdf')],
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['updated' => false])->json();
        $planId = collect($first['files'])->firstWhere('name', 'plan.pdf')['id'];

        // Second item links the same stored PDF instead of uploading it again.
        $second = $this->actingAs($admin)->post('/trainings/import/item', [
            'type' => 'gym', 'title' => 'B1 | potisci', 'training_date' => '2026-11-05',
            'copy_file_ids' => [$planId],
        ], ['Accept' => 'application/json'])->assertOk()->json();
        $copy = TrainingFile::where('training_id', $second['id'])->firstOrFail();
        $original = TrainingFile::findOrFail($planId);
        $this->assertSame($original->path, $copy->path);
        $this->assertSame('plan.pdf', $copy->original_name);

        // Running the same item again updates it instead of adding a second one.
        $this->actingAs($admin)->post('/trainings/import/item', [
            'type' => 'gym', 'title' => 'B1 | potisci', 'training_date' => '2026-11-05', 'description' => 'New text',
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['updated' => true]);
        $this->assertSame(3, Training::count());
        $this->assertSame('New text', Training::find($second['id'])->description);

        // Removing the PDF from one training keeps the stored file for the other.
        $this->actingAs($admin)->post('/trainings/' . $second['id'], [
            '_method' => 'put', 'type' => 'gym', 'title' => 'B1 | potisci', 'training_date' => '2026-11-05',
            'remove_file_ids' => [$copy->id],
        ])->assertRedirect();
        Storage::disk('local')->assertExists($original->path);
        $this->actingAs($this->userWithRole('user'))->get('/trainings/files/' . $planId)->assertOk();

        // Bad items return JSON errors.
        $this->actingAs($admin)->post('/trainings/import/item', ['type' => 'gym', 'title' => 'X'], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('training_date');
    }

    public function test_exercises_are_saved_per_training_and_shown_to_members(): void
    {
        $admin = $this->userWithRole('superuser');
        $this->actingAs($admin)->post('/trainings', [
            'type' => 'gym', 'title' => 'B1', 'training_date' => '2026-12-01', 'exercises_sent' => 1,
            'exercises' => [
                ['name' => 'Potisak nogama na spravi', 'group' => 'women', 'sets' => '3×20', 'rest' => '60-75 s', 'load_women' => '10-20 kg'],
                ['name' => 'Čučanj sa šipkom', 'group' => 'men', 'sets' => '3×20', 'rest' => '60-75 s', 'load_men' => '20-30 kg'],
                ['name' => 'Bench press', 'group' => 'all', 'sets' => '3×20', 'load_women' => '10-15 kg', 'load_men' => '20-30 kg'],
            ],
        ])->assertRedirect();

        $t = Training::firstOrFail();
        $rows = TrainingExercise::where('training_id', $t->id)->orderBy('id')->get();
        $this->assertSame([1, 1, 2], $rows->pluck('position')->all()); // women + men share step 1
        $this->assertSame(3, Exercise::count());

        // Same name in another letter case reuses the library exercise.
        $this->actingAs($admin)->post('/trainings/' . $t->id, [
            '_method' => 'put', 'type' => 'gym', 'title' => 'B1', 'training_date' => '2026-12-01', 'exercises_sent' => 1,
            'exercises' => [['name' => 'bench PRESS', 'group' => 'all', 'sets' => '4×12']],
        ])->assertRedirect();
        $this->assertSame(3, Exercise::count());
        $this->actingAs($admin)->post('/trainings/import/exercise', ['name' => 'čučanj SA šipkom'], ['Accept' => 'application/json'])
            ->assertOk()->assertJson(['created' => false]);
        $this->assertSame(3, Exercise::count());
        $this->assertSame(1, TrainingExercise::where('training_id', $t->id)->count());

        // Saving without the exercises field leaves them alone; exercises_sent with none clears them.
        $this->actingAs($admin)->post('/trainings/' . $t->id, ['_method' => 'put', 'type' => 'gym', 'title' => 'B1', 'training_date' => '2026-12-01'])->assertRedirect();
        $this->assertSame(1, TrainingExercise::where('training_id', $t->id)->count());

        $member = $this->userWithRole('user');
        $this->actingAs($member)->get('/trainings/' . $t->id)->assertOk()
            ->assertInertia(fn ($p) => $p->where('training.exercises.0.exercise.name', 'Bench press')->where('training.exercises.0.sets', '4×12'));
        $this->actingAs($member)->get('/trainings/exercises')->assertOk()
            ->assertInertia(fn ($p) => $p->component('Trainings/Exercises')->has('exercises', 3));
        $this->actingAs($member)->get('/trainings/exercises/1/edit')->assertForbidden();

        $this->actingAs($admin)->post('/trainings/' . $t->id, ['_method' => 'put', 'type' => 'gym', 'title' => 'B1', 'training_date' => '2026-12-01', 'exercises_sent' => 1])->assertRedirect();
        $this->assertSame(0, TrainingExercise::where('training_id', $t->id)->count());
    }

    public function test_exercise_library_edit_image_and_delete_rules(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->post('/trainings/exercises', [
            'name' => 'Face pull', 'muscles' => 'Zadnje rame', 'how_to' => 'Sajla u visini očiju.',
            'image' => UploadedFile::fake()->image('face.png', 40, 40),
        ])->assertRedirect('/trainings/exercises');
        $e = Exercise::firstOrFail();
        Storage::disk('local')->assertExists($e->image_path);
        $this->actingAs($this->userWithRole('user'))->get('/trainings/exercises/' . $e->id . '/image')->assertOk();

        // Used exercises cannot be deleted.
        $t = Training::create(['type' => 'gym', 'title' => 'A1', 'training_date' => '2026-12-01']);
        TrainingExercise::create(['training_id' => $t->id, 'exercise_id' => $e->id, 'position' => 1]);
        $this->actingAs($admin)->delete('/trainings/exercises/' . $e->id)->assertRedirect();
        $this->assertNotNull(Exercise::find($e->id));

        TrainingExercise::query()->delete();
        $path = $e->image_path;
        $this->actingAs($admin)->delete('/trainings/exercises/' . $e->id)->assertRedirect('/trainings/exercises');
        $this->assertNull(Exercise::find($e->id));
        Storage::disk('local')->assertMissing($path);
    }

    public function test_import_exercises_fill_only_missing_fields_and_update_trainings(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');
        Exercise::create(['name' => 'Bench press', 'how_to' => 'Edited in the app']);

        $this->actingAs($admin)->post('/trainings/import/exercise', [
            'name' => 'bench press', 'muscles' => 'Grudi', 'how_to' => 'From PDF',
            'image' => UploadedFile::fake()->image('bench.jpg', 30, 30),
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['created' => false]);
        $e = Exercise::firstOrFail();
        $this->assertSame('Edited in the app', $e->how_to);
        $this->assertSame('Grudi', $e->muscles);
        $this->assertNotNull($e->image_path);

        // A training imported earlier with a page image gets exercises and loses the old attachment.
        $t = Training::create(['type' => 'gym', 'title' => 'A1 | povlačenja', 'training_date' => '2026-11-03', 'description' => 'old list']);
        $this->actingAs($admin)->post('/trainings/' . $t->id, [
            '_method' => 'put', 'type' => 'gym', 'title' => 'A1 | povlačenja', 'training_date' => '2026-11-03',
            'images' => [UploadedFile::fake()->image('Teretana 2026-11-03 A1.jpg', 20, 20)],
        ]);
        $this->assertSame(1, $t->files()->count());

        $this->actingAs($admin)->post('/trainings/import/item', [
            'type' => 'gym', 'title' => 'A1 | povlačenja', 'training_date' => '2026-11-03', 'description' => 'Laka nedelja',
            'remove_files' => ['Teretana 2026-11-03 A1.jpg', 'plan.pdf'],
            'exercises_sent' => 1,
            'exercises' => [
                ['name' => 'Bench press', 'group' => 'all', 'position' => 1, 'sets' => '3×20'],
                ['name' => 'Face pull', 'group' => 'all', 'position' => 2, 'sets' => '3×20'],
            ],
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['updated' => true]);

        $t->refresh();
        $this->assertSame('Laka nedelja', $t->description);
        $this->assertSame(0, $t->files()->count());
        $this->assertSame(['Bench press', 'Face pull'], $t->exercises()->orderBy('position')->get()->map(fn ($r) => $r->exercise->name)->all());
        $this->assertSame(2, Exercise::count());
    }

    public function test_import_item_replaces_an_older_title(): void
    {
        $admin = $this->userWithRole('admin');
        $old = Training::create(['type' => 'gym', 'title' => 'A1 | povlačenja i biceps', 'training_date' => '2026-11-03', 'description' => 'old']);
        Training::create(['type' => 'water', 'title' => 'A1 | povlačenja i biceps', 'training_date' => '2026-11-03']);

        $item = ['type' => 'gym', 'date' => '2026-11-03', 'title' => 'A1 | povlačenja, ramena i biceps', 'replaces' => ['A1 | POVLAČENJA I BICEPS']];
        $this->actingAs($admin)->postJson('/trainings/import/check', ['items' => [
            $item,
            ['type' => 'gym', 'date' => '2026-11-05', 'title' => 'B1', 'replaces' => ['A1 | povlačenja i biceps']],
        ]])->assertOk()->assertExactJson(['existing' => ['gym|2026-11-03|a1 | povlačenja, ramena i biceps']]);

        $this->actingAs($admin)->post('/trainings/import/item', [
            'type' => 'gym', 'title' => $item['title'], 'training_date' => '2026-11-03', 'description' => 'new',
            'replaces' => $item['replaces'],
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['updated' => true, 'id' => $old->id]);

        $old->refresh();
        $this->assertSame('A1 | povlačenja, ramena i biceps', $old->title);
        $this->assertSame('new', $old->description);
        $this->assertSame(2, Training::count());
    }
}
