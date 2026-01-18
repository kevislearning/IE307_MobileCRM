<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskSubtask extends Model
{
    protected $fillable = [
        'task_id','title','is_done'
    ];

    protected $casts = [
        'is_done' => 'bool',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
