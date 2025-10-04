<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'session_type_id',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public function sessionType()
    {
        return $this->belongsTo(SessionType::class);
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class, 'session_id');
    }

    public function members()
    {
        return $this->belongsToMany(Member::class, 'attendance_records', 'session_id', 'member_id')
            ->withPivot('present')
            ->withTimestamps();
    }
}
