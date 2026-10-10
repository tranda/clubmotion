<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A saved variation of a competition's room plan. `data` holds:
 * room_counts, rooms_check_in/out, rooms [{number, name, beds}],
 * participants [{id, room_number, check_in, check_out}].
 */
class CompetitionRoomSnapshot extends Model
{
    protected $fillable = ['competition_id', 'name', 'data', 'created_by'];

    protected $casts = [
        'data' => 'array',
    ];

    public function competition()
    {
        return $this->belongsTo(Competition::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
