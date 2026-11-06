<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class AdminNoteFile extends Model
{
    public const KIND_IMAGE = 'image';
    public const KIND_ATTACHMENT = 'attachment';
    public const DISK = 'local';

    protected $fillable = [
        'admin_note_id',
        'kind',
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
        static::deleting(function (AdminNoteFile $file) {
            Storage::disk(self::DISK)->delete($file->path);
        });
    }

    public function note()
    {
        return $this->belongsTo(AdminNote::class, 'admin_note_id');
    }

    public function url(): string
    {
        return '/notes/files/' . $this->id;
    }

    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'name' => $this->original_name,
            'mime' => $this->mime,
            'size' => $this->size,
            'url' => $this->url(),
        ];
    }
}
