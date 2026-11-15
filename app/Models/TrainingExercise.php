<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// An exercise as part of one training: its order, who does it and how much.
class TrainingExercise extends Model
{
    public const GROUPS = ['all', 'women', 'men'];

    protected $fillable = [
        'training_id',
        'exercise_id',
        'position',
        'group',
        'sets',
        'rest',
        'load_women',
        'load_men',
        'note',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function training()
    {
        return $this->belongsTo(Training::class);
    }

    public function exercise()
    {
        return $this->belongsTo(Exercise::class);
    }

    public function toClient(): array
    {
        return [
            'id' => $this->id,
            'position' => $this->position,
            'group' => $this->group,
            'sets' => $this->sets,
            'rest' => $this->rest,
            'load_women' => $this->load_women,
            'load_men' => $this->load_men,
            'note' => $this->note,
            'exercise' => $this->exercise?->toClient(),
        ];
    }
}
