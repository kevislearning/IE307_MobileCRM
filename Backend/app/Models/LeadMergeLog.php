<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadMergeLog extends Model
{
    protected $fillable = [
        'target_lead_id',
        'source_lead_id',
        'merged_by',
        'note',
    ];
}
