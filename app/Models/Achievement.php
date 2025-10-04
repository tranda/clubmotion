<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    protected $fillable = [
        'member_id',
        'competition_class',
        'medal',
        'event_name',
        'year',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }
}
