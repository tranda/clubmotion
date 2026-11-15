<?php

namespace App\Http\Controllers;

use App\Models\Exercise;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

// Exercise library (Trainings → Exercises): every member can look up an exercise —
// illustration, muscles and how to do it. Admins and superusers add and edit them.
class ExerciseController extends Controller
{
    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private const MAX_IMAGE_KB = 10240;

    public function index()
    {
        if (!Schema::hasTable('exercises')) {
            return redirect()->route('trainings.index');
        }

        return Inertia::render('Trainings/Exercises', [
            'exercises' => Exercise::withCount('trainingExercises')->orderBy('name')->get()
                ->map(fn (Exercise $e) => $e->toClient() + ['used' => $e->training_exercises_count])
                ->values(),
        ]);
    }

    public function image(Exercise $exercise)
    {
        $disk = Storage::disk(Exercise::DISK);
        abort_unless($exercise->image_path && $disk->exists($exercise->image_path), 404);
        abort_unless(in_array($exercise->image_mime, self::IMAGE_MIMES, true), 404);

        return response()->file($disk->path($exercise->image_path), [
            'Content-Type' => $exercise->image_mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, max-age=604800',
        ]);
    }

    public function create()
    {
        return Inertia::render('Trainings/ExerciseEdit', ['exercise' => null]);
    }

    public function edit(Exercise $exercise)
    {
        return Inertia::render('Trainings/ExerciseEdit', [
            'exercise' => $exercise->toClient() + ['used' => $exercise->trainingExercises()->count()],
        ]);
    }

    public function store(Request $request)
    {
        $exercise = new Exercise(['created_by' => auth()->id()]);
        $this->save($request, $exercise);

        return redirect()->route('trainings.exercises.index')->with('success', 'Exercise saved.');
    }

    public function update(Request $request, Exercise $exercise)
    {
        $this->save($request, $exercise);

        return redirect()->route('trainings.exercises.index')->with('success', 'Exercise saved.');
    }

    public function destroy(Exercise $exercise)
    {
        if ($exercise->trainingExercises()->exists()) {
            return back()->with('error', 'This exercise is used in trainings and cannot be deleted.');
        }
        $exercise->delete();

        return redirect()->route('trainings.exercises.index')->with('success', 'Exercise deleted.');
    }

    private function save(Request $request, Exercise $exercise): void
    {
        $data = $request->validate([
            'name' => 'required|string|max:150|unique:exercises,name' . ($exercise->exists ? ',' . $exercise->id : ''),
            'muscles' => 'nullable|string|max:2000',
            'how_to' => 'nullable|string|max:10000',
            'image' => ['nullable', 'file', 'max:' . self::MAX_IMAGE_KB, 'mimes:jpg,jpeg,png,gif,webp'],
            'remove_image' => 'nullable|boolean',
        ]);

        $exercise->name = trim(preg_replace('/\s+/u', ' ', $data['name']));
        $exercise->muscles = trim((string) ($data['muscles'] ?? '')) ?: null;
        $exercise->how_to = trim((string) ($data['how_to'] ?? '')) ?: null;
        $exercise->updated_by = auth()->id();

        $disk = Storage::disk(Exercise::DISK);
        if (($request->boolean('remove_image') || $request->hasFile('image')) && $exercise->image_path) {
            $disk->delete($exercise->image_path);
            $exercise->image_path = null;
            $exercise->image_mime = null;
        }
        if ($request->hasFile('image')) {
            $upload = $request->file('image');
            $ext = preg_replace('/[^a-z0-9]/', '', strtolower($upload->getClientOriginalExtension())) ?: 'jpg';
            $exercise->image_path = $upload->storeAs('exercises', Str::random(40) . '.' . $ext, Exercise::DISK);
            $exercise->image_mime = $upload->getMimeType();
        }
        $exercise->save();
    }
}
