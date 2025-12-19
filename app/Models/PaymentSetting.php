<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    /**
     * Get a setting value by key
     */
    public static function get($key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value by key
     */
    public static function set($key, $value, $description = null)
    {
        $data = ['value' => $value];
        if ($description !== null) {
            $data['description'] = $description;
        }
        return static::updateOrCreate(['key' => $key], $data);
    }

    /**
     * Get annual payment configuration
     */
    public static function getAnnualConfig()
    {
        return [
            'annual_amount' => (float) static::get('annual_payment_amount', 32000),
        ];
    }
}
