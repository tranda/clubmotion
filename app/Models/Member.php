<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'membership_number', 'date_of_birth', 'address', 'phone', 'email',
        'category_id', 'medical_validity', 'profile_image_url', 'password_hash', 'is_active', 'image', 'user_id'
    ];

    protected $casts = [
            'membership_number' => 'integer', // Ensure Laravel treats it as an integer
            'date_of_birth' => 'date:Y-m-d', // Cast to Carbon and specify the output format (optional here)
            'medical_validity' => 'date',     // Cast to Carbon
            'is_active' => 'boolean',         // Example of casting other types
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(MembershipCategory::class, 'category_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}