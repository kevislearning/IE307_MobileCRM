<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name','email','password','role','phone','avatar','language','must_change_password',
        'notifications_enabled','theme','manager_id','team_id'
    ];

    protected $casts = [
        'notifications_enabled' => 'boolean',
    ];

    protected $hidden = [
        'password',
    ];

    const ADMIN = 'admin';
    const OWNER = 'owner';
    const STAFF = 'staff';

    public function isAdmin()
    {
        return $this->role === self::ADMIN;
    }

    public function isOwner(): bool
    {
        return $this->role === self::OWNER;
    }

    public function isStaff(): bool
    {
        return $this->role === self::STAFF;
    }

    /**
     * Kiểm tra xem user có phải là manager (admin hoặc owner) không
     * Phương thức alias để tương thích với frontend
     */
    public function isManager(): bool
    {
        return $this->isAdmin() || $this->isOwner();
    }

    /**
     * Kiểm tra xem user có phải là nhân viên bán hàng không
     * Phương thức alias để tương thích với frontend
     */
    public function isSales(): bool
    {
        return $this->isStaff();
    }

    public function hasRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Lấy manager của user này (manager trực tiếp)
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Lấy tất cả user được quản lý bởi user này (để tương thích ngược)
     */
    public function teamMembers(): HasMany
    {
        return $this->hasMany(User::class, 'manager_id');
    }

    /**
     * Lấy team mà user này thuộc về
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    /**
     * Lấy team được quản lý bởi user này (nếu họ là manager)
     */
    public function managedTeam(): HasMany
    {
        return $this->hasMany(Team::class, 'manager_id');
    }

    /**
     * Lấy thành viên team thông qua team (cho managers)
     */
    public function getTeamSalesMembers()
    {
        if ($this->isOwner()) {
            // Lấy tất cả staff trong cùng team
            return User::where('team_id', $this->team_id)
                ->where('role', self::STAFF)
                ->get();
        }
        return collect();
    }
}
