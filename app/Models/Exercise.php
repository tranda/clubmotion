<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

// One exercise in the library: illustration, muscles and how to do it.
class Exercise extends Model
{
    public const DISK = 'local';

    protected $fillable = [
        'name',
        'muscles',
        'how_to',
        'image_path',
        'image_mime',
        'created_by',
        'updated_by',
    ];

    protected static function booted()
    {
        static::deleting(function (Exercise $exercise) {
            if ($exercise->image_path) {
                Storage::disk(self::DISK)->delete($exercise->image_path);
            }
        });
    }

    public function trainingExercises()
    {
        return $this->hasMany(TrainingExercise::class);
    }

    public function imageUrl(): ?string
    {
        // updated_at in the address so a replaced image is not served from the browser cache.
        return $this->image_path ? '/trainings/exercises/' . $this->id . '/image?v=' . ($this->updated_at?->timestamp ?? 0) : null;
    }

    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'muscles' => $this->muscles,
            'how_to' => $this->how_to,
            'image_url' => $this->imageUrl(),
        ];
    }
}
