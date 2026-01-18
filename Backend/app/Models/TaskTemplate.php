<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskTemplate extends Model
{
    protected $fillable = [
        'title','description','type','default_due_days'
    ];
}
