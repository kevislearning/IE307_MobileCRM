<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    protected $fillable = [
        'file_name','file_path','file_type',
        'uploaded_by','lead_id','task_id'
    ];
}
