<?php

namespace App\Policies;

use App\Models\Opportunity;
use App\Models\User;

class OpportunityPolicy
{
    public function view(User $user, Opportunity $opportunity): bool
    {
        // Staff không thể truy cập opportunities
        if ($user->isStaff()) {
            return false;
        }

        // Admin có thể xem tất cả
        if ($user->isAdmin()) {
            return true;
        }

        // Owner có thể xem opportunities của mình
        if ($opportunity->owner_id === $user->id) {
            return true;
        }

        // Manager (vai trò owner) có thể xem opportunities của thành viên trong team
        if ($user->isOwner()) {
            $owner = User::find($opportunity->owner_id);
            if ($owner) {
                // Kiểm tra quyền truy cập theo team
                if ($owner->team_id && $owner->team_id === $user->team_id) {
                    return true;
                }
                // Kiểm tra quyền truy cập theo manager
                if ($owner->manager_id === $user->id) {
                    return true;
                }
            }
        }

        return false;
    }

    public function update(User $user, Opportunity $opportunity): bool
    {
        return $this->view($user, $opportunity);
    }

    public function delete(User $user, Opportunity $opportunity): bool
    {
        return $this->view($user, $opportunity);
    }
}
