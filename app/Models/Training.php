<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// A water or gym training plan shown to members ("Trainings" in the menu).
class Training extends Model
{
    use SoftDeletes;

    public const TYPE_WATER = 'water';
    public const TYPE_GYM = 'gym';
    public const TYPES = [self::TYPE_WATER, self::TYPE_GYM];

    protected $fillable = [
        'type',
        'title',
        'training_date',
        'description',
        'links',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'training_date' => 'date',
        'links' => 'array', // [{url, label}]
    ];

    public function files()
    {
        return $this->hasMany(TrainingFile::class)->orderBy('id');
    }

    public function exercises()
    {
        return $this->hasMany(TrainingExercise::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
