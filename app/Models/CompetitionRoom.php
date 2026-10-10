<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompetitionRoom extends Model
{
    protected $fillable = ['competition_id', 'number', 'name', 'beds'];

    protected $casts = [
        'number' => 'integer',
        'beds' => 'integer',
    ];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function participants()
    {
        return $this->hasMany(CompetitionParticipant::class);
    }
}
