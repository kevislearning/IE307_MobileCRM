<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Task;
use App\Models\UserDevice;
use App\Services\FcmService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckTaskDueCommand extends Command
{
    protected $signature = 'tasks:check-due';
    protected $description = 'Mark overdue tasks and notify tasks due soon';

    public function handle(): int
    {
        $now = Carbon::now()->startOfMinute();
        $today = $now->toDateString();
        $soon = $now->copy()->addHours(3);

        // Mark overdue
        Task::whereDate('due_date', '<', $today)
            ->where('status', '!=', Task::STATUS_DONE)
            ->update(['status' => Task::STATUS_OVERDUE]);

        // Notify tasks due within next 3h, not done
        $dueSoonTasks = Task::where('status', Task::STATUS_IN_PROGRESS)
            ->whereBetween('due_date', [$today, $soon->toDateString()])
            ->get();

        foreach ($dueSoonTasks as $task) {
            Notification::updateOrCreate(
                [
                    'user_id' => $task->assigned_to,
                    'type' => 'TASK',
                    'content' => 'Task sắp đến hạn: '.$task->title,
                    'payload' => ['task_id' => $task->id],
                ],
                ['is_read' => false]
            );

            $tokens = UserDevice::where('user_id', $task->assigned_to)->pluck('fcm_token')->toArray();
            app(FcmService::class)->send($tokens, 'Task due soon', $task->title, ['task_id' => $task->id]);
        }

        $this->info('Checked tasks due/overdue.');
        return Command::SUCCESS;
    }
}
