<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipCategory extends Model
{
    use HasFactory;

    protected $fillable = ['category_name', 'description', 'is_age_based', 'min_age', 'max_age'];

    protected $casts = [
        'is_age_based' => 'boolean',
        'min_age' => 'integer',
        'max_age' => 'integer',
    ];
}