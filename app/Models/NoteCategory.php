<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NoteCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'normalized_name',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function notes()
    {
        return $this->hasMany(Note::class);
    }

    public static function normalize(string $name): string
    {
        $value = mb_strtolower(trim($name));
        $value = preg_replace('/\s+/u', ' ', $value);
        $value = preg_replace('/[^\p{L}\p{N} ]+/u', '', $value);
        return trim($value);
    }
}
