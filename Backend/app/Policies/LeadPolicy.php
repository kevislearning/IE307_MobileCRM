<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;

class LeadPolicy
{
    public function view(User $user, Lead $lead): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // Truy cập trực tiếp: user là owner hoặc được giao
        if ($lead->assigned_to === $user->id || $lead->owner_id === $user->id) {
            return true;
        }

        // Manager (vai trò owner) có thể xem leads:
        // 1. Nếu lead được giao cho thành viên trong team của họ (qua manager_id)
        // 2. Hoặc nếu lead thuộc team của họ (qua team_id)
        if ($user->isOwner()) {
            // Kiểm tra quyền truy cập theo team
            if ($lead->team_id && $lead->team_id === $user->team_id) {
                return true;
            }
            
            // Kiểm tra quyền truy cập theo manager (người được giao báo cáo cho manager này)
            if ($lead->assignee && $lead->assignee->manager_id === $user->id) {
                return true;
            }
        }

        return false;
    }

    public function update(User $user, Lead $lead)
    {
        return $this->view($user, $lead);
    }

    public function delete(User $user, Lead $lead): bool
    {
        return $this->view($user, $lead);
    }
}
