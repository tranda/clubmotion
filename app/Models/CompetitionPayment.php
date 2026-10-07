<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompetitionPayment extends Model
{
    public const METHODS = ['cash', 'bank_transfer', 'other'];

    protected $fillable = [
        'competition_participant_id', 'amount', 'paid_at', 'payment_method',
        'note', 'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date:Y-m-d',
    ];

    public function participant()
    {
        return $this->belongsTo(CompetitionParticipant::class, 'competition_participant_id');
    }
}
