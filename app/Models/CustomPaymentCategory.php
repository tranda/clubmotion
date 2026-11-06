<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomPaymentCategory extends Model
{
    use HasFactory;

    protected $table = 'note_categories';

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

    public function payments()
    {
        return $this->hasMany(CustomPayment::class, 'note_category_id');
    }

    public static function normalize(string $name): string
    {
        $value = mb_strtolower(trim($name));
        $value = preg_replace('/\s+/u', ' ', $value);
        $value = preg_replace('/[^\p{L}\p{N} ]+/u', '', $value);
        return trim($value);
    }
}
