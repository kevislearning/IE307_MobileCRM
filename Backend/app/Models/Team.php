<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'manager_id',
        'last_assigned_user_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the manager of the team
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function lastAssignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_assigned_user_id');
    }

    /**
     * Get all members of the team (including manager)
     */
    public function members(): HasMany
    {
        return $this->hasMany(User::class, 'team_id');
    }

    /**
     * Get all sales staff in the team (excluding manager)
     */
    public function salesMembers(): HasMany
    {
        return $this->hasMany(User::class, 'team_id')->where('role', 'staff');
    }

    /**
     * Get all leads assigned to this team
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'team_id');
    }

    /**
     * Get all tasks for this team
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'team_id');
    }
}
