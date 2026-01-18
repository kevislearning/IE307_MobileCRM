<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    protected $fillable = [
        'type','title','content','lead_id','user_id','happened_at'
    ];

    protected $casts = [
        'happened_at' => 'datetime',
    ];

    protected $appends = ['action'];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getActionAttribute(): string
    {
        $typeLabels = [
            'CALL' => 'Gọi điện',
            'TASK' => 'Công việc',
            'NOTE' => 'Ghi chú',
        ];

        $label = $typeLabels[$this->type] ?? $this->type;
        
        if ($this->title) {
            return "{$label}: {$this->title}";
        }
        
        if ($this->content) {
            $shortContent = mb_strlen($this->content) > 50 
                ? mb_substr($this->content, 0, 50) . '...' 
                : $this->content;
            return "{$label}: {$shortContent}";
        }
        
        return $label;
    }
}
