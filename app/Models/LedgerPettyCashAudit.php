<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LedgerPettyCashAudit extends Model
{
    use HasFactory;

    public const OPERATIONS = ['edit', 'add', 'sub'];

    protected $fillable = [
        'operation',
        'delta',
        'previous_amount',
        'new_amount',
        'note',
        'user_id',
    ];

    protected $casts = [
        'delta' => 'decimal:2',
        'previous_amount' => 'decimal:2',
        'new_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
