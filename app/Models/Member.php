<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'membership_number', 'date_of_birth', 'address', 'phone', 'email',
        'category_id', 'medical_validity', 'profile_image_url', 'password_hash', 'is_active', 'image', 'user_id', 'exemption_status'
    ];

    protected $casts = [
            'membership_number' => 'integer', // Ensure Laravel treats it as an integer
            'date_of_birth' => 'date:Y-m-d', // Cast to Carbon and specify the output format
            'medical_validity' => 'date:Y-m-d', // Cast to Carbon and format as date only
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

    public function payments()
    {
        return $this->hasMany(MembershipPayment::class)
            ->orderBy('payment_year', 'desc')
            ->orderBy('payment_month', 'desc');
    }

    public function paymentsForYear($year)
    {
        return $this->payments()->where('payment_year', $year);
    }

    public function isExempt()
    {
        return in_array($this->exemption_status, ['pocasni', 'saradnik']);
    }

    public function getExemptDisplayAttribute()
    {
        return $this->exemption_status === 'pocasni' ? 'POC' :
               ($this->exemption_status === 'saradnik' ? 'SAR' : null);
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function attendanceSessions()
    {
        return $this->belongsToMany(AttendanceSession::class, 'attendance_records', 'member_id', 'session_id')
            ->withPivot('present')
            ->withTimestamps();
    }

    /**
     * Calculate and return the appropriate category based on age
     */
    public function calculateCategory()
    {
        // If no birth date, return current category or null
        if (!$this->date_of_birth) {
            return $this->category_id;
        }

        // Calculate age
        $age = \Carbon\Carbon::parse($this->date_of_birth)->age;

        // Get all age-based categories
        $ageBasedCategories = MembershipCategory::where('is_age_based', true)->get();

        // Find matching category based on age range
        foreach ($ageBasedCategories as $category) {
            $minAge = $category->min_age ?? 0;
            $maxAge = $category->max_age ?? 999;

            if ($age >= $minAge && $age <= $maxAge) {
                return $category->id;
            }
        }

        // If no age-based category matches, return current category
        return $this->category_id;
    }

    /**
     * Get the calculated category relationship
     */
    public function getCalculatedCategoryAttribute()
    {
        $categoryId = $this->calculateCategory();
        return MembershipCategory::find($categoryId);
    }
}