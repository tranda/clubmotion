<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ToolSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    public static function get($key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set($key, $value, $description = null)
    {
        $data = ['value' => $value];
        if ($description !== null) {
            $data['description'] = $description;
        }
        return static::updateOrCreate(['key' => $key], $data);
    }
}
