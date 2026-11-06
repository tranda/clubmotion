<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomPayment extends Model
{
    use HasFactory, SoftDeletes;

    // Table keeps its original name from when this section was called Notes.
    protected $table = 'notes';

    protected $fillable = [
        'entry_date',
        'member_id',
        'note_category_id',
        'amount',
        'description',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'entry_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(CustomPaymentCategory::class, 'note_category_id');
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
