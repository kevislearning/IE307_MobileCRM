<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        
        // User is assigned the task
        if ($task->assigned_to === $user->id) {
            return true;
        }

        // Manager can view tasks of team members
        if ($user->isOwner()) {
            // Check team-based access
            if ($task->team_id && $task->team_id === $user->team_id) {
                return true;
            }
            
            // Check manager-based access
            if ($task->assigned_to) {
                $assignee = User::find($task->assigned_to);
                if ($assignee && $assignee->manager_id === $user->id) {
                    return true;
                }
            }
        }

        return false;
    }

    public function create(User $user): bool
    {
        // All authenticated users can create tasks
        return $user->isAdmin() || $user->isOwner() || $user->isStaff();
    }

    public function update(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }

    /**
     * Determine whether the user can mark the task as completed.
     * Only the assigned user can mark task as completed.
     */
    public function complete(User $user, Task $task): bool
    {
        // Admin can always complete tasks
        if ($user->isAdmin()) {
            return true;
        }

        // Only the assigned user can mark task as completed
        return $task->assigned_to === $user->id;
    }
}
