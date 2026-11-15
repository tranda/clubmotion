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
        // Remove the stored file together with its row.
        static::deleting(function (TrainingFile $file) {
            Storage::disk(self::DISK)->delete($file->path);
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
