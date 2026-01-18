<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\Team;
use App\Models\Lead;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = ['IN_PROGRESS', 'DONE'];
        $types = ['CALL', 'MEET', 'NOTE', 'OTHER'];
        $taskTitles = [
            'Gọi điện tư vấn',
            'Gặp mặt khách hàng',
            'Gửi báo giá',
            'Follow up sau meeting',
            'Demo sản phẩm',
            'Chuẩn bị hợp đồng',
            'Hỗ trợ kỹ thuật',
            'Chốt đơn hàng',
        ];
        
        $teams = Team::with('salesMembers')->get();
        $leads = Lead::all();
        
        $taskCount = 0;
        
        foreach ($teams as $team) {
            $salesMembers = $team->salesMembers;
            $teamLeads = $leads->where('team_id', $team->id);
            
            if ($salesMembers->isEmpty() || $teamLeads->isEmpty()) {
                continue;
            }
            
            // Create tasks for each team
            foreach (range(1, 5) as $i) {
                $dueDate = rand(0, 1)
                    ? Carbon::now()->addDays(rand(1, 14))
                    : Carbon::now()->subDays(rand(1, 7));
                
                $assignedTo = $salesMembers->random();
                $lead = $teamLeads->random();

                DB::table('tasks')->insert([
                    'type' => $types[array_rand($types)],
                    'title' => $taskTitles[array_rand($taskTitles)],
                    'lead_id' => $lead->id,
                    'team_id' => $team->id,
                    'due_date' => $dueDate,
                    'status' => $statuses[array_rand($statuses)],
                    'assigned_to' => $assignedTo->id,
                    'created_by' => $team->manager_id,
                    'created_at' => now()->subDays(rand(1, 14)),
                    'updated_at' => now(),
                ]);
                
                $taskCount++;
            }
        }
        
        $this->command->info("Created {$taskCount} tasks distributed across all teams");
    }
}
