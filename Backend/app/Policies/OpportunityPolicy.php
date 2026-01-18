<?php

namespace App\Policies;

use App\Models\Opportunity;
use App\Models\User;

class OpportunityPolicy
{
    public function view(User $user, Opportunity $opportunity): bool
    {
        // Staff cannot access opportunities
        if ($user->isStaff()) {
            return false;
        }

        // Admin can view all
        if ($user->isAdmin()) {
            return true;
        }

        // Owner can view their own opportunities
        if ($opportunity->owner_id === $user->id) {
            return true;
        }

        // Manager (owner role) can view team members' opportunities
        if ($user->isOwner()) {
            $owner = User::find($opportunity->owner_id);
            if ($owner) {
                // Check team-based access
                if ($owner->team_id && $owner->team_id === $user->team_id) {
                    return true;
                }
                // Check manager-based access
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
