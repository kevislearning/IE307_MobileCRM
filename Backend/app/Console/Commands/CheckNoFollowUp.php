<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\Task;
use App\Models\Notification;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CheckNoFollowUp extends Command
{
    /**
     * Chữ ký của console command
     *
     * @var string
     */
    protected $signature = 'crm:check-no-follow-up';

    /**
     * Mô tả command
     *
     * @var string
     */
    protected $description = 'Check for leads without follow-up and overdue tasks, then send notifications';

    /**
     * Thực thi command
     */
    public function handle()
    {
        $this->info('Checking for no follow-up leads and overdue tasks...');

        // 1. check task quá hạn
        $this->checkOverdueTasks();

        // 2. lead trạng thái "caring" - không hoạt động 7 ngày
        $this->checkCaringLeadsNoActivity();

        // 3. lead trạng thái "lead" - không hoạt động 3 ngày
        $this->checkNewLeadsNoActivity();

        $this->info('Done checking no follow-up notifications.');

        return Command::SUCCESS;
    }

    /**
     * Kiểm tra các task quá hạn và thông báo cho user được gán
     */
    protected function checkOverdueTasks()
    {
        $overdueTasks = Task::where('status', '!=', Task::STATUS_DONE)
            ->whereDate('due_date', '<', now()->toDateString())
            ->get();

        $notificationCount = 0;

        foreach ($overdueTasks as $task) {
            // Kiểm tra xem đã gửi thông báo hôm nay cho task này chưa
            $existingNotification = Notification::where('user_id', $task->assigned_to)
                ->where('type', Notification::TYPE_TASK_OVERDUE)
                ->whereDate('created_at', now()->toDateString())
                ->whereJsonContains('payload->task_id', $task->id)
                ->exists();

            if (!$existingNotification) {
                $daysPast = Carbon::parse($task->due_date)->diffInDays(now());
                
                Notification::create([
                    'user_id' => $task->assigned_to,
                    'type' => Notification::TYPE_TASK_OVERDUE,
                    'content' => "Công việc \"{$task->title}\" đã quá hạn {$daysPast} ngày",
                    'payload' => [
                        'task_id' => $task->id,
                        'lead_id' => $task->lead_id,
                        'due_date' => $task->due_date,
                        'days_overdue' => $daysPast,
                    ],
                ]);
                $notificationCount++;
            }
        }

        $this->info("Created {$notificationCount} overdue task notifications.");
    }

    /**
     * Kiểm tra các lead có trạng thái "CARING" không có hoạt động trong 7 ngày
     */
    protected function checkCaringLeadsNoActivity()
    {
        $sevenDaysAgo = now()->subDays(7);

        // Các lead có trạng thái CARING và không hoạt động trong 7 ngày
        $leads = Lead::where('status', Lead::STATUS_CARING)
            ->where(function ($query) use ($sevenDaysAgo) {
                $query->whereNull('last_activity_at')
                    ->orWhere('last_activity_at', '<', $sevenDaysAgo);
            })
            ->get();

        $notificationCount = 0;

        foreach ($leads as $lead) {
            $assignedTo = $lead->assigned_to ?? $lead->owner_id;
            
            if (!$assignedTo) {
                continue;
            }

            // Kiểm tra xem đã gửi thông báo hôm nay cho lead này chưa
            $existingNotification = Notification::where('user_id', $assignedTo)
                ->where('type', Notification::TYPE_NO_FOLLOW_UP)
                ->whereDate('created_at', now()->toDateString())
                ->whereJsonContains('payload->lead_id', $lead->id)
                ->exists();

            if (!$existingNotification) {
                $daysSinceActivity = $lead->last_activity_at 
                    ? Carbon::parse($lead->last_activity_at)->diffInDays(now())
                    : null;

                Notification::create([
                    'user_id' => $assignedTo,
                    'type' => Notification::TYPE_NO_FOLLOW_UP,
                    'content' => "Khách hàng \"{$lead->full_name}\" (Đang chăm sóc) chưa có hoạt động trong 7 ngày qua",
                    'payload' => [
                        'lead_id' => $lead->id,
                        'lead_status' => $lead->status,
                        'days_since_activity' => $daysSinceActivity,
                        'reason' => 'caring_no_activity_7_days',
                    ],
                ]);
                $notificationCount++;
            }
        }

        $this->info("Created {$notificationCount} no follow-up notifications for CARING leads.");
    }

    /**
     * Kiểm tra các lead có trạng thái "LEAD" không có hoạt động trong 3 ngày
     */
    protected function checkNewLeadsNoActivity()
    {
        $threeDaysAgo = now()->subDays(3);

        // Các lead có trạng thái LEAD và không hoạt động trong 3 ngày
        $leads = Lead::where('status', Lead::STATUS_LEAD)
            ->where(function ($query) use ($threeDaysAgo) {
                $query->whereNull('last_activity_at')
                    ->orWhere('last_activity_at', '<', $threeDaysAgo);
            })
            ->get();

        $notificationCount = 0;

        foreach ($leads as $lead) {
            $assignedTo = $lead->assigned_to ?? $lead->owner_id;
            
            if (!$assignedTo) {
                continue;
            }

            // Kiểm tra xem đã gửi thông báo hôm nay cho lead này chưa
            $existingNotification = Notification::where('user_id', $assignedTo)
                ->where('type', Notification::TYPE_NO_FOLLOW_UP)
                ->whereDate('created_at', now()->toDateString())
                ->whereJsonContains('payload->lead_id', $lead->id)
                ->exists();

            if (!$existingNotification) {
                $daysSinceActivity = $lead->last_activity_at 
                    ? Carbon::parse($lead->last_activity_at)->diffInDays(now())
                    : null;

                Notification::create([
                    'user_id' => $assignedTo,
                    'type' => Notification::TYPE_NO_FOLLOW_UP,
                    'content' => "Lead \"{$lead->full_name}\" chưa có hoạt động trong 3 ngày qua",
                    'payload' => [
                        'lead_id' => $lead->id,
                        'lead_status' => $lead->status,
                        'days_since_activity' => $daysSinceActivity,
                        'reason' => 'lead_no_activity_3_days',
                    ],
                ]);
                $notificationCount++;
            }
        }

        $this->info("Created {$notificationCount} no follow-up notifications for LEAD status.");
    }
}
