<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadFilter extends Model
{
    protected $fillable = [
        'user_id','name','filters','is_default'
    ];

    protected $casts = [
        'filters' => 'array',
        'is_default' => 'bool',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
