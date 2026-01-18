<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public const STATUS_DONE = 'DONE';
    public const STATUS_OVERDUE = 'OVERDUE';

    protected $fillable = [
        'title','type','lead_id','opportunity_id',
        'description','notes','due_date','status','assigned_to','team_id','created_by','completed_at',
        'recurrence_type','recurrence_interval','recurrence_end_date','reminder_at'
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'recurrence_end_date' => 'date',
        'reminder_at' => 'datetime',
    ];

    protected $appends = [
        'computed_status',
    ];

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class, 'opportunity_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function subtasks()
    {
        return $this->hasMany(TaskSubtask::class);
    }

    public function histories()
    {
        return $this->hasMany(TaskHistory::class);
    }

    public function tags()
    {
        return $this->belongsToMany(TaskTag::class, 'task_tag_task')->withTimestamps();
    }

    public function getComputedStatusAttribute(): string
    {
        if ($this->status === self::STATUS_DONE) {
            return self::STATUS_DONE;
        }

        if ($this->due_date && $this->due_date->isPast()) {
            return self::STATUS_OVERDUE;
        }

        return $this->status ?? self::STATUS_IN_PROGRESS;
    }

    public function scopeSearch($query, $term)
    {
        if (!$term) return;
        $term = "%$term%";
        $query->where('title', 'like', $term);
    }
}
