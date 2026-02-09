<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Notification;
use App\Models\Task;
use App\Models\UserDevice;
use App\Services\FcmService;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index()
    {
        return Notification::where('user_id',Auth::id())->get();
    }

    public function show(Notification $notification)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        if (!$user->isAdmin() && $notification->user_id !== $user->id) {
            abort(403, 'Unauthorized access to this notification.');
        }

        // Tự động đánh dấu đã đọc khi owner mở
        if ($notification->user_id === $user->id && !$notification->is_read) {
            $notification->update(['is_read' => true]);
        }
        return $notification;
    }

    public function markAsRead(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this notification.');
        }

        $notification->update(['is_read' => true]);
        return $notification;
    }

    public function markAsUnread(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this notification.');
        }

        $notification->update(['is_read' => false]);
        return $notification;
    }

    public function destroy(Notification $notification)
    {
        if ($notification->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to this notification.');
        }

        $notification->delete();
        return response()->json(['message' => 'Notification deleted successfully']);
    }

    public function badge()
    {
        $count = Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->count();

        return ['unread' => $count];
    }

    public function markAllAsRead()
    {
        Notification::where('user_id', Auth::id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function taskDueSoon()
    {
        return Notification::where('user_id', Auth::id())
            ->where('type', 'TASK')
            ->where('is_read', false)
            ->orderByDesc('created_at')
            ->get();
    }

    public function taskReminders()
    {
        $userId = Auth::id();
        $tasks = Task::whereNotNull('reminder_at')
            ->whereNull('reminder_sent_at')
            ->where('status', '!=', Task::STATUS_DONE)
            ->where('assigned_to', $userId)
            ->where('reminder_at', '<=', now())
            ->get();

        foreach ($tasks as $task) {
            Notification::create([
                'user_id' => $userId,
                'type' => 'TASK_REMINDER',
                'content' => "Nhắc việc: {$task->title}",
                'payload' => [
                    'task_id' => $task->id,
                    'lead_id' => $task->lead_id,
                    'reminder_at' => $task->reminder_at,
                ],
            ]);

            $tokens = UserDevice::where('user_id', $userId)->pluck('fcm_token')->toArray();
            if ($tokens) {
                app(FcmService::class)->send($tokens, 'Task reminder', $task->title, ['task_id' => $task->id]);
            }

            $task->update(['reminder_sent_at' => now()]);
        }

        return response()->json(['count' => $tasks->count()]);
    }

    public function followUpDue()
    {
        $user = Auth::user();

        $leadQuery = Lead::query();
        if ($user->isAdmin()) {
            // không giới hạn
        } elseif ($user->isOwner()) {
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            $leadQuery->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
        } else {
            $leadQuery->where('assigned_to', $user->id);
        }

        $leads = $leadQuery
            ->whereNotNull('last_activity_at')
            ->whereRaw('last_activity_at < DATE_SUB(NOW(), INTERVAL IFNULL(follow_up_sla_days, 3) DAY)')
            ->where(function($q) {
                $q->whereNull('last_follow_up_notified_at')
                  ->orWhere('last_follow_up_notified_at', '<', now()->subDays(1));
            })
            ->get();

        foreach ($leads as $lead) {
            Notification::create([
                'user_id' => $lead->assigned_to ?? $lead->owner_id,
                'type' => 'LEAD_FOLLOW_UP',
                'content' => "Lead cần follow-up: {$lead->full_name}",
                'payload' => ['lead_id' => $lead->id],
            ]);
            $lead->update(['last_follow_up_notified_at' => now()]);
        }

        return response()->json(['count' => $leads->count()]);
    }
}
