<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LedgerImportStagingRow extends Model
{
    use HasFactory;

    protected $table = 'ledger_import_staging';

    protected $fillable = [
        'batch_id',
        'tab_gid',
        'tab_label',
        'raw_row_json',
        'parsed_date',
        'parsed_type',
        'parsed_bucket',
        'parsed_amount',
        'parsed_description',
        'normalized_description',
        'suggested_category_id',
        'mapped_category_id',
        'suggested_member_id',
        'mapped_member_id',
        'action',
        'error',
        'sort_order',
    ];

    protected $casts = [
        'raw_row_json' => 'array',
        'parsed_date' => 'date:Y-m-d',
        'parsed_amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function batch()
    {
        return $this->belongsTo(LedgerImportBatch::class, 'batch_id');
    }

    public function suggestedCategory()
    {
        return $this->belongsTo(LedgerCategory::class, 'suggested_category_id');
    }

    public function mappedCategory()
    {
        return $this->belongsTo(LedgerCategory::class, 'mapped_category_id');
    }

    public function suggestedMember()
    {
        return $this->belongsTo(Member::class, 'suggested_member_id');
    }

    public function mappedMember()
    {
        return $this->belongsTo(Member::class, 'mapped_member_id');
    }
}
