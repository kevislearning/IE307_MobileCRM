<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    public const TYPE_NORMAL = 'normal';
    public const TYPE_MANAGER = 'manager';

    protected $fillable = [
        'title',
        'content',
        'lead_id',
        'user_id',
        'type'
    ];

    protected $with = ['user:id,name,role'];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeNormal($query)
    {
        return $query->where('type', self::TYPE_NORMAL);
    }

    public function scopeManager($query)
    {
        return $query->where('type', self::TYPE_MANAGER);
    }
}
