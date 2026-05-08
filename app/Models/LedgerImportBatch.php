<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LedgerImportBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_url',
        'status',
        'summary_json',
        'created_by',
    ];

    protected $casts = [
        'summary_json' => 'array',
    ];

    public function stagingRows()
    {
        return $this->hasMany(LedgerImportStagingRow::class, 'batch_id');
    }

    public function entries()
    {
        return $this->hasMany(LedgerEntry::class, 'import_batch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
