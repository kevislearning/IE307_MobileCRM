<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Notification;
use App\Models\User;
use App\Models\Lead;
use App\Models\Task;
use App\Models\Team;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $teams = Team::with(['manager', 'salesMembers'])->get();
        
        foreach ($teams as $team) {
            $manager = $team->manager;
            $salesMembers = $team->salesMembers;
            
            if ($salesMembers->isEmpty() || !$manager) {
                continue;
            }

            // Get leads and tasks for this team
            $teamLeads = Lead::where('team_id', $team->id)->get();
            $teamTasks = Task::where('team_id', $team->id)->get();

            foreach ($salesMembers as $sales) {
                // 1. Task assignment notifications
                $salesTasks = $teamTasks->where('assigned_to', $sales->id)->take(2);
                foreach ($salesTasks as $task) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_TASK_ASSIGNED,
                        'content' => "Bạn được giao công việc: {$task->title}",
                        'payload' => [
                            'task_id' => $task->id,
                            'lead_id' => $task->lead_id,
                            'assigned_by' => $manager->id,
                            'assigned_by_name' => $manager->name,
                        ],
                        'is_read' => rand(0, 1),
                        'created_at' => now()->subHours(rand(1, 48)),
                        'updated_at' => now(),
                    ]);
                }

                // 2. Lead assignment notifications
                $salesLeads = $teamLeads->where('assigned_to', $sales->id)->take(2);
                foreach ($salesLeads as $lead) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_LEAD_ASSIGNED,
                        'content' => "Bạn được giao khách hàng: {$lead->full_name}",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'assigned_by' => $manager->id,
                            'assigned_by_name' => $manager->name,
                        ],
                        'is_read' => rand(0, 1),
                        'created_at' => now()->subHours(rand(1, 72)),
                        'updated_at' => now(),
                    ]);
                }

                // 3. Task overdue notifications
                $overdueTasks = $teamTasks->where('assigned_to', $sales->id)
                    ->where('status', '!=', Task::STATUS_DONE)
                    ->take(1);
                foreach ($overdueTasks as $task) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_TASK_OVERDUE,
                        'content' => "Công việc \"{$task->title}\" đã quá hạn 2 ngày",
                        'payload' => [
                            'task_id' => $task->id,
                            'lead_id' => $task->lead_id,
                            'due_date' => $task->due_date,
                            'days_overdue' => 2,
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(rand(1, 24)),
                        'updated_at' => now(),
                    ]);
                }

                // 4. No follow-up notifications for INTERESTED leads (7 days)
                $interestedLeads = $teamLeads->where('assigned_to', $sales->id)
                    ->where('status', Lead::STATUS_INTERESTED)
                    ->take(1);
                foreach ($interestedLeads as $lead) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_NO_FOLLOW_UP,
                        'content' => "Khách hàng \"{$lead->full_name}\" (Quan tâm) chưa có hoạt động trong 7 ngày qua",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'lead_status' => Lead::STATUS_INTERESTED,
                            'days_since_activity' => 7,
                            'reason' => 'interested_no_activity_7_days',
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(rand(1, 12)),
                        'updated_at' => now(),
                    ]);
                }

                // 5. No follow-up notifications for LEAD_NEW status (3 days)
                $newLeads = $teamLeads->where('assigned_to', $sales->id)
                    ->where('status', Lead::STATUS_LEAD_NEW)
                    ->take(1);
                foreach ($newLeads as $lead) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_NO_FOLLOW_UP,
                        'content' => "Lead \"{$lead->full_name}\" chưa có hoạt động trong 3 ngày qua",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'lead_status' => Lead::STATUS_LEAD_NEW,
                            'days_since_activity' => 3,
                            'reason' => 'lead_no_activity_3_days',
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(rand(1, 6)),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        $this->command->info('Created notifications for all sales members');
    }
}
