<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadAssignmentLog extends Model
{
    protected $fillable = [
        'lead_id',
        'from_user_id',
        'to_user_id',
        'assigned_by',
        'note',
    ];
}
