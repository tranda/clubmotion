<?php

namespace Tests\Feature;

use App\Models\AdminNote;
use App\Models\AdminNoteFile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminNotesTest extends TestCase
{
    // The app's full migration history is MySQL-only, so build just the tables
    // these pages use on in-memory SQLite, then run the Notes migration itself.
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
        foreach ([
            '2026_05_11_120000_create_note_categories_table.php',
            '2026_05_11_120001_create_notes_table.php',
            '2026_11_06_120000_create_admin_notes_tables.php',
        ] as $file) {
            (require database_path('migrations/' . $file))->up();
        }
    }

    private function userWithRole(string $role): User
    {
        $r = Role::firstOrCreate(['name' => $role]);
        return User::factory()->create(['role_id' => $r->id]);
    }

    private function doc(string $extra = ''): string
    {
        return json_encode(['type' => 'doc', 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Hello ' . $extra]]],
        ]]);
    }

    public function test_regular_users_cannot_open_notes(): void
    {
        $this->actingAs($this->userWithRole('user'))->get('/notes')->assertForbidden();
    }

    public function test_image_and_attachment_flow(): void
    {
        Storage::fake('local');
        $admin = $this->userWithRole('admin');
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);

        $image = $this->actingAs($admin)->postJson('/notes/files', [
            'kind' => 'image',
            'file' => UploadedFile::fake()->image('paste.png', 20, 20),
        ])->assertOk()->json();
        $attachment = $this->actingAs($admin)->postJson('/notes/files', [
            'kind' => 'attachment',
            'file' => UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
        ])->assertOk()->json();
        $unused = $this->actingAs($admin)->postJson('/notes/files', [
            'kind' => 'attachment',
            'file' => UploadedFile::fake()->create('other.txt', 1, 'text/plain'),
        ])->assertOk()->json();

        // SVG is not accepted as an image.
        $this->actingAs($admin)->postJson('/notes/files', [
            'kind' => 'image',
            'file' => UploadedFile::fake()->create('x.svg', 1, 'image/svg+xml'),
        ])->assertStatus(422);

        $body = json_encode(['type' => 'doc', 'content' => [
            ['type' => 'image', 'attrs' => ['src' => $image['url']]],
        ]]);
        $this->actingAs($admin)->post('/notes', [
            'title' => 'Trip',
            'body' => $body,
            'body_text' => 'trip text',
            'attachment_ids' => [$attachment['id']],
        ])->assertRedirect();

        $note = AdminNote::firstOrFail();
        $this->assertSame([$image['id'], $attachment['id']], $note->files()->orderBy('id')->pluck('id')->all());
        $this->assertNull(AdminNoteFile::find($unused['id'])->admin_note_id);

        // Files are served through the app with safe headers.
        $this->actingAs($admin)->get($image['url'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAs($this->userWithRole('user'))->get($image['url'])->assertForbidden();

        // Removing the image from the text and the attachment deletes both files.
        $paths = $note->files()->pluck('path')->all();
        $this->actingAs($admin)->put("/notes/{$note->id}", [
            'title' => 'Trip',
            'body' => $this->doc(),
            'body_text' => 'Hello',
            'attachment_ids' => [],
        ])->assertRedirect("/notes/{$note->id}");
        $this->assertSame(0, $note->files()->count());
        foreach ($paths as $p) {
            Storage::disk('local')->assertMissing($p);
        }

        // Search finds by text; delete and restore.
        $this->actingAs($admin)->get('/notes?q=Hello')->assertOk();
        $this->actingAs($admin)->delete("/notes/{$note->id}")->assertRedirect('/notes');
        $this->assertSoftDeleted($note);
        $this->actingAs($admin)->post("/notes/{$note->id}/restore")->assertRedirect();
        $this->assertNotSoftDeleted($note);
    }

    public function test_invalid_body_is_rejected(): void
    {
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
        $this->actingAs($this->userWithRole('superuser'))
            ->post('/notes', ['title' => 'x', 'body' => '<script>'])
            ->assertStatus(422);
    }

    public function test_custom_payments_moved(): void
    {
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->get('/custom-payments')->assertOk();
        $this->actingAs($admin)->get('/custom-payments/categories')->assertOk();
        $this->actingAs($admin)->get('/notes/categories')->assertRedirect('/custom-payments/categories');
    }
}
