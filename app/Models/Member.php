<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'membership_number', 'date_of_birth', 'address', 'phone', 'email', 
        'category_id', 'medical_validity', 'profile_image_url', 'password_hash', 'is_active'
    ];

    public function category()
    {
        return $this->belongsTo(MembershipCategory::class, 'category_id', 'id');
    }
}