<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentRatePreset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_month',
        'end_month',
        'rate',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'start_month' => 'integer',
        'end_month' => 'integer',
        'rate' => 'decimal:2',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get all active presets ordered by sort_order
     */
    public static function getActive()
    {
        return static::where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }
}
