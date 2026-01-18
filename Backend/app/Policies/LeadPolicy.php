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

        // Direct access: user is owner or assigned
        if ($lead->assigned_to === $user->id || $lead->owner_id === $user->id) {
            return true;
        }

        // Manager (owner role) can view leads:
        // 1. If lead is assigned to one of their team members (via manager_id)
        // 2. Or if lead belongs to their team (via team_id)
        if ($user->isOwner()) {
            // Check team-based access
            if ($lead->team_id && $lead->team_id === $user->team_id) {
                return true;
            }
            
            // Check manager-based access (assignee reports to this manager)
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
