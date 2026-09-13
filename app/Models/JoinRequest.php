<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JoinRequest extends Model
{
    use HasFactory;

    // Status values
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_PROCESSING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    protected $fillable = [
        'name', 'email', 'date_of_birth', 'message', 'status',
        'admin_notes', 'member_id', 'resolved_by', 'resolved_at',
        'last_emailed_at', 'emails_sent', 'last_email_subject',
    ];

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'resolved_at' => 'datetime',
        'last_emailed_at' => 'datetime',
        'emails_sent' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
