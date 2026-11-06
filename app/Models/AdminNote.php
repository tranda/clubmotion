<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// A staff note ("Notes" in the menu), shared by admins and superusers.
class AdminNote extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'body',
        'body_text',
        'member_id',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function files()
    {
        return $this->hasMany(AdminNoteFile::class);
    }

    public function attachments()
    {
        return $this->hasMany(AdminNoteFile::class)->where('kind', AdminNoteFile::KIND_ATTACHMENT);
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
