// filepath: /d:/Projects/motion/club.motion.rs/clubmotion/app/Models/MembershipCategory.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipCategory extends Model
{
    use HasFactory;

    protected $fillable = ['category_name', 'description'];
}