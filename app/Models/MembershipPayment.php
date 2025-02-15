<?php
// filepath: /d:/Projects/motion/club.motion.rs/clubmotion/app/Models/MembershipPayment.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembershipPayment extends Model
{
    use HasFactory;

    protected $fillable = ['member_id', 'payment_date', 'payment_amount', 'payment_status'];
}