<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class TrainingFile extends Model
{
    public const DISK = 'local';

    protected $fillable = [
        'training_id',
        'original_name',
        'path',
        'mime',
        'size',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected static function booted()
    {
        // Remove the stored file together with its row, unless another training still
        // uses the same stored file (imports share one copy of a whole-plan PDF).
        static::deleting(function (TrainingFile $file) {
            $shared = static::where('path', $file->path)->where('id', '!=', $file->id)->exists();
            if (!$shared) {
                Storage::disk(self::DISK)->delete($file->path);
            }
        });
    }

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->original_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'url' => '/trainings/files/' . $this->id,
        ];
    }
}
