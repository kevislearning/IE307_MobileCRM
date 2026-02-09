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
     * Lấy manager của team
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
     * Lấy tất cả thành viên của team (bao gồm manager)
     */
    public function members(): HasMany
    {
        return $this->hasMany(User::class, 'team_id');
    }

    /**
     * Lấy tất cả nhân viên bán hàng trong team (không bao gồm manager)
     */
    public function salesMembers(): HasMany
    {
        return $this->hasMany(User::class, 'team_id')->where('role', 'staff');
    }

    /**
     * Lấy tất cả leads được giao cho team này
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'team_id');
    }

    /**
     * Lấy tất cả tasks của team này
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'team_id');
    }
}
