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
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crm:check-no-follow-up';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for leads without follow-up and overdue tasks, then send notifications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for no follow-up leads and overdue tasks...');

        // 1. Check overdue tasks
        $this->checkOverdueTasks();

        // 2. Check leads with status "CARING" - no activity for 7 days
        $this->checkCaringLeadsNoActivity();

        // 3. Check leads with status "LEAD" - no activity for 3 days
        $this->checkNewLeadsNoActivity();

        $this->info('Done checking no follow-up notifications.');

        return Command::SUCCESS;
    }

    /**
     * Check for overdue tasks and notify assigned users
     */
    protected function checkOverdueTasks()
    {
        $overdueTasks = Task::where('status', '!=', Task::STATUS_DONE)
            ->whereDate('due_date', '<', now()->toDateString())
            ->get();

        $notificationCount = 0;

        foreach ($overdueTasks as $task) {
            // Check if we already sent notification today for this task
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
     * Check leads with status "CARING" that have no activity for 7 days
     */
    protected function checkCaringLeadsNoActivity()
    {
        $sevenDaysAgo = now()->subDays(7);

        // Leads with status CARING and no activity for 7 days
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

            // Check if we already sent notification today for this lead
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
     * Check leads with status "LEAD" that have no activity for 3 days
     */
    protected function checkNewLeadsNoActivity()
    {
        $threeDaysAgo = now()->subDays(3);

        // Leads with status LEAD and no activity for 3 days
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

            // Check if we already sent notification today for this lead
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
