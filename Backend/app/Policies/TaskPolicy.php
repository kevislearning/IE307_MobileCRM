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
        
        // User được giao task này
        if ($task->assigned_to === $user->id) {
            return true;
        }

        // Manager có thể xem task của thành viên trong team
        if ($user->isOwner()) {
            // Kiểm tra quyền truy cập theo team
            if ($task->team_id && $task->team_id === $user->team_id) {
                return true;
            }
            
            // Kiểm tra quyền truy cập theo manager
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
        // Tất cả user đã đăng nhập đều có thể tạo task
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
     * Xác định user có thể đánh dấu task hoàn thành không.
     * Chỉ user được giao mới có thể đánh dấu task hoàn thành.
     */
    public function complete(User $user, Task $task): bool
    {
        // Admin luôn có thể hoàn thành task
        if ($user->isAdmin()) {
            return true;
        }

        // Chỉ user được giao mới có thể đánh dấu task hoàn thành
        return $task->assigned_to === $user->id;
    }
}
