<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Team;
use App\Models\User;
use App\Models\Lead;
use App\Models\Note;
use App\Models\Task;
use App\Models\Activity;
use App\Models\Notification;
use App\Models\Opportunity;
use App\Models\OpportunityStageHistory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ComprehensiveTestSeeder extends Seeder
{
    private $admin;
    private $managers = [];
    private $teams = [];
    private $salesByTeam = [];

    public function run(): void
    {
        $this->command->info('🚀 Starting comprehensive test data seeding...');
        
        $this->createUsersAndTeams();
        $this->createLeadsForAllStatuses();
        $this->createNotesWithManagerNotes();
        $this->createTasksForAllScenarios();
        $this->createActivitiesTimeline();
        $this->createNotificationsForAllTypes();
        $this->createOpportunitiesForPipeline();
        
        $this->command->info('✅ Comprehensive test data created successfully!');
        $this->printTestAccounts();
    }

    private function createUsersAndTeams(): void
    {
        $this->command->info('📦 Creating users and teams...');

        // Admin
        $this->admin = User::firstOrCreate(
            ['email' => 'admin@crm.test'],
            [
                'name' => 'Admin Tổng',
                'password' => Hash::make('123456'),
                'role' => 'admin',
            ]
        );

        // Team 1 - Hà Nội (Full team with 3 sales)
        $manager1 = User::firstOrCreate(
            ['email' => 'manager1@crm.test'],
            [
                'name' => 'Nguyễn Văn An (Manager HN)',
                'password' => Hash::make('123456'),
                'role' => 'owner',
                'phone' => '0901234567',
            ]
        );

        $team1 = Team::firstOrCreate(
            ['name' => 'Team Hà Nội'],
            [
                'description' => 'Team bán hàng khu vực Hà Nội - Phụ trách khách hàng miền Bắc',
                'manager_id' => $manager1->id,
                'is_active' => true,
            ]
        );
        $manager1->update(['team_id' => $team1->id]);
        $this->managers[] = $manager1;
        $this->teams[] = $team1;

        // Sales for Team 1
        $salesTeam1 = [];
        $salesData1 = [
            ['email' => 'sales.hn1@crm.test', 'name' => 'Trần Thị Bình (Sales HN)', 'phone' => '0912345671'],
            ['email' => 'sales.hn2@crm.test', 'name' => 'Lê Văn Cường (Sales HN)', 'phone' => '0912345672'],
            ['email' => 'sales.hn3@crm.test', 'name' => 'Phạm Thị Dung (Sales HN)', 'phone' => '0912345673'],
        ];
        foreach ($salesData1 as $data) {
            $sales = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('123456'),
                    'role' => 'staff',
                    'phone' => $data['phone'],
                    'manager_id' => $manager1->id,
                    'team_id' => $team1->id,
                ]
            );
            $sales->update(['manager_id' => $manager1->id, 'team_id' => $team1->id]);
            $salesTeam1[] = $sales;
        }
        $this->salesByTeam[$team1->id] = $salesTeam1;

        // Team 2 - HCM (2 sales)
        $manager2 = User::firstOrCreate(
            ['email' => 'manager2@crm.test'],
            [
                'name' => 'Hoàng Văn Em (Manager HCM)',
                'password' => Hash::make('123456'),
                'role' => 'owner',
                'phone' => '0902345678',
            ]
        );

        $team2 = Team::firstOrCreate(
            ['name' => 'Team Sài Gòn'],
            [
                'description' => 'Team bán hàng khu vực TP.HCM - Phụ trách khách hàng miền Nam',
                'manager_id' => $manager2->id,
                'is_active' => true,
            ]
        );
        $manager2->update(['team_id' => $team2->id]);
        $this->managers[] = $manager2;
        $this->teams[] = $team2;

        // Sales for Team 2
        $salesTeam2 = [];
        $salesData2 = [
            ['email' => 'sales.hcm1@crm.test', 'name' => 'Ngô Thị Phương (Sales HCM)', 'phone' => '0923456781'],
            ['email' => 'sales.hcm2@crm.test', 'name' => 'Đỗ Văn Giang (Sales HCM)', 'phone' => '0923456782'],
        ];
        foreach ($salesData2 as $data) {
            $sales = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('123456'),
                    'role' => 'staff',
                    'phone' => $data['phone'],
                    'manager_id' => $manager2->id,
                    'team_id' => $team2->id,
                ]
            );
            $sales->update(['manager_id' => $manager2->id, 'team_id' => $team2->id]);
            $salesTeam2[] = $sales;
        }
        $this->salesByTeam[$team2->id] = $salesTeam2;

        $this->command->info("  ✓ Created Admin + 2 Managers + 5 Sales");
    }

    private function createLeadsForAllStatuses(): void
    {
        $this->command->info('👥 Creating leads for all statuses...');

        $statuses = [
            Lead::STATUS_LEAD_NEW,
            Lead::STATUS_CONTACTED, 
            Lead::STATUS_INTERESTED,
            Lead::STATUS_QUALIFIED,
            Lead::STATUS_WON,
            Lead::STATUS_LOST,
        ];

        $sources = ['website', 'facebook', 'referral', 'cold_call', 'event', 'zalo', 'tiktok'];
        $industries = ['education', 'retail', 'finance', 'technology', 'healthcare', 'manufacturing', 'other'];
        $companySizes = ['small', 'medium', 'enterprise'];
        $priorities = ['LOW', 'MEDIUM', 'HIGH'];

        $leadCount = 0;
        $usedPhones = [];
        $usedEmails = [];

        foreach ($this->teams as $team) {
            $salesMembers = $this->salesByTeam[$team->id];
            $manager = User::find($team->manager_id);

            // Create leads for each status (2-4 per status per sales)
            foreach ($salesMembers as $sales) {
                foreach ($statuses as $statusIndex => $status) {
                    // Create 2-4 leads per status
                    $count = rand(2, 4);
                    for ($i = 0; $i < $count; $i++) {
                        $leadCount++;
                        
                        // Generate unique phone
                        $phone = null;
                        while (!$phone || isset($usedPhones[$phone])) {
                            $phone = '09' . str_pad((string) rand(0, 99999999), 8, '0', STR_PAD_LEFT);
                        }
                        $usedPhones[$phone] = true;

                        // Generate unique email
                        $email = null;
                        while (!$email || isset($usedEmails[$email])) {
                            $email = 'khachhang' . rand(10000, 99999) . '@email.com';
                        }
                        $usedEmails[$email] = true;

                        $createdAt = now()->subDays(rand(1, 90));
                        $lastActivity = $status === Lead::STATUS_LEAD_NEW ? null : $createdAt->copy()->addDays(rand(1, 30));
                        
                        // For testing stale leads
                        if ($status === Lead::STATUS_INTERESTED && $i === 0) {
                            $lastActivity = now()->subDays(10); // Stale lead
                        }

                        $industry = $industries[array_rand($industries)];
                        $companySize = $companySizes[array_rand($companySizes)];

                        Lead::create([
                            'full_name' => $this->getVietnameseName($leadCount),
                            'email' => $email,
                            'phone_number' => $phone,
                            'phone_secondary' => rand(0, 1) ? '028' . rand(10000000, 99999999) : null,
                            'company' => $this->getCompanyName($leadCount),
                            'company_size' => $companySize,
                            'industry' => $industry,
                            'website' => rand(0, 1) ? 'https://company' . $leadCount . '.vn' : null,
                            'budget' => rand(10, 500) * 1000000,
                            'address' => $this->getAddress($team->name),
                            'note' => $this->getLeadNote($status),
                            'status' => $status,
                            'source' => $sources[array_rand($sources)],
                            'source_detail' => 'Campaign Q' . rand(1, 4) . '/2026',
                            'campaign' => 'Chiến dịch ' . ['Tết', 'Hè', 'Thu', 'Đông'][rand(0, 3)] . ' 2026',
                            'score' => $this->getScoreByStatus($status),
                            'priority' => $priorities[array_rand($priorities)],
                            'owner_id' => $sales->id,
                            'assigned_to' => $sales->id,
                            'assigned_by' => $manager->id,
                            'assigned_at' => $createdAt,
                            'team_id' => $team->id,
                            'last_activity_at' => $lastActivity,
                            'unread_by_owner' => $status === Lead::STATUS_LEAD_NEW,
                            'created_at' => $createdAt,
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }

        $this->command->info("  ✓ Created {$leadCount} leads across all statuses");
    }

    private function createNotesWithManagerNotes(): void
    {
        $this->command->info('📝 Creating notes (including manager notes)...');

        $leads = Lead::whereIn('status', [Lead::STATUS_INTERESTED, Lead::STATUS_QUALIFIED, Lead::STATUS_WON])
            ->get();

        $noteCount = 0;
        $managerNoteCount = 0;

        foreach ($leads as $lead) {
            $sales = User::find($lead->assigned_to);
            $manager = User::find($sales->manager_id ?? $lead->owner_id);

            // Sales creates normal notes (1-3 per lead)
            $normalCount = rand(1, 3);
            for ($i = 0; $i < $normalCount; $i++) {
                Note::create([
                    'title' => $this->getNoteTitle($lead->status),
                    'content' => $this->getNoteContent($lead->status, $i),
                    'lead_id' => $lead->id,
                    'user_id' => $sales->id,
                    'type' => Note::TYPE_NORMAL,
                    'created_at' => $lead->created_at->copy()->addDays($i + 1),
                ]);
                $noteCount++;
            }

            // Manager creates manager notes for QUALIFIED leads (private notes)
            if ($lead->status === Lead::STATUS_QUALIFIED && $manager) {
                Note::create([
                    'title' => '⚠️ Ghi chú quản lý (Không hiển thị cho Sales)',
                    'content' => $this->getManagerNoteContent($lead),
                    'lead_id' => $lead->id,
                    'user_id' => $manager->id,
                    'type' => Note::TYPE_MANAGER,
                    'created_at' => $lead->created_at->copy()->addDays(5),
                ]);
                $managerNoteCount++;
            }
        }

        $this->command->info("  ✓ Created {$noteCount} normal notes + {$managerNoteCount} manager notes");
    }

    private function createTasksForAllScenarios(): void
    {
        $this->command->info('📋 Creating tasks for all scenarios...');

        // Task types: CALL, MEET, NOTE, OTHER (from migration enum)
        $leads = Lead::whereNotIn('status', [Lead::STATUS_WON, Lead::STATUS_LOST])->get();

        $taskCount = 0;
        $overdueCount = 0;
        $todayCount = 0;
        $upcomingCount = 0;

        foreach ($leads as $index => $lead) {
            $sales = User::find($lead->assigned_to);
            
            // Scenario 1: Overdue tasks (due in past, not done)
            if ($index % 5 === 0) {
                Task::create([
                    'title' => 'Gọi lại khách ' . $lead->full_name,
                    'type' => 'CALL',
                    'description' => 'Khách yêu cầu gọi lại để trao đổi thêm về sản phẩm',
                    'lead_id' => $lead->id,
                    'due_date' => now()->subDays(rand(1, 5)),
                    'status' => Task::STATUS_IN_PROGRESS,
                    'assigned_to' => $sales->id,
                    'created_by' => $sales->manager_id ?? $sales->id,
                    'team_id' => $lead->team_id,
                    'created_at' => now()->subDays(10),
                ]);
                $taskCount++;
                $overdueCount++;
            }

            // Scenario 2: Tasks due today
            if ($index % 4 === 0) {
                Task::create([
                    'title' => 'Follow-up ' . $lead->full_name,
                    'type' => 'NOTE', // Use NOTE instead of FOLLOW_UP
                    'description' => 'Theo dõi phản hồi từ khách hàng',
                    'lead_id' => $lead->id,
                    'due_date' => now(),
                    'status' => Task::STATUS_IN_PROGRESS,
                    'assigned_to' => $sales->id,
                    'created_by' => $sales->id,
                    'team_id' => $lead->team_id,
                    'created_at' => now()->subDays(3),
                ]);
                $taskCount++;
                $todayCount++;
            }

            // Scenario 3: Upcoming tasks (next 7 days)
            if ($index % 3 === 0) {
                Task::create([
                    'title' => 'Gặp mặt ' . $lead->company,
                    'type' => 'MEET', // Use MEET instead of DEMO
                    'description' => 'Gặp mặt trình diễn sản phẩm theo yêu cầu khách hàng',
                    'lead_id' => $lead->id,
                    'due_date' => now()->addDays(rand(1, 7)),
                    'status' => Task::STATUS_IN_PROGRESS,
                    'assigned_to' => $sales->id,
                    'created_by' => $sales->manager_id ?? $sales->id,
                    'team_id' => $lead->team_id,
                    'created_at' => now()->subDays(1),
                ]);
                $taskCount++;
                $upcomingCount++;
            }

            // Scenario 4: Completed tasks
            if ($index % 6 === 0) {
                Task::create([
                    'title' => 'Gặp mặt ' . $lead->full_name,
                    'type' => 'MEET',
                    'description' => 'Đã gặp mặt và trao đổi chi tiết',
                    'lead_id' => $lead->id,
                    'due_date' => now()->subDays(2),
                    'status' => Task::STATUS_DONE,
                    'completed_at' => now()->subDays(2),
                    'assigned_to' => $sales->id,
                    'created_by' => $sales->id,
                    'team_id' => $lead->team_id,
                    'created_at' => now()->subDays(5),
                ]);
                $taskCount++;
            }

            // Scenario 5: Manager assigned task to sales
            if ($index % 7 === 0 && $sales->manager_id) {
                Task::create([
                    'title' => '🎯 [Manager] Liên hệ khách VIP ' . $lead->full_name,
                    'type' => 'CALL',
                    'description' => 'Manager yêu cầu ưu tiên liên hệ khách hàng này',
                    'notes' => 'Khách hàng tiềm năng cao, cần chăm sóc đặc biệt',
                    'lead_id' => $lead->id,
                    'due_date' => now()->addDays(1),
                    'status' => Task::STATUS_IN_PROGRESS,
                    'assigned_to' => $sales->id,
                    'created_by' => $sales->manager_id,
                    'team_id' => $lead->team_id,
                    'created_at' => now(),
                ]);
                $taskCount++;
            }
        }

        $this->command->info("  ✓ Created {$taskCount} tasks (Overdue: {$overdueCount}, Today: {$todayCount}, Upcoming: {$upcomingCount})");
    }

    private function createActivitiesTimeline(): void
    {
        $this->command->info('📊 Creating activities timeline...');

        $leads = Lead::whereNotIn('status', [Lead::STATUS_LEAD_NEW])->get();
        $activityCount = 0;

        foreach ($leads as $lead) {
            $sales = User::find($lead->assigned_to);
            $dayOffset = 0;

            // Create activity chain based on status
            $activities = $this->getActivityChainByStatus($lead->status);
            
            foreach ($activities as $activity) {
                $dayOffset += rand(1, 3);
                Activity::create([
                    'type' => $activity['type'],
                    'title' => $activity['title'],
                    'content' => str_replace('{name}', $lead->full_name, $activity['content']),
                    'lead_id' => $lead->id,
                    'user_id' => $sales->id,
                    'happened_at' => $lead->created_at->copy()->addDays($dayOffset),
                    'created_at' => $lead->created_at->copy()->addDays($dayOffset),
                ]);
                $activityCount++;
            }
        }

        $this->command->info("  ✓ Created {$activityCount} activities");
    }

    private function createNotificationsForAllTypes(): void
    {
        $this->command->info('🔔 Creating notifications for all types...');

        $notifCount = 0;

        foreach ($this->teams as $team) {
            $manager = User::find($team->manager_id);
            $salesMembers = $this->salesByTeam[$team->id];

            foreach ($salesMembers as $sales) {
                $salesLeads = Lead::where('assigned_to', $sales->id)->get();

                // 1. Lead assigned notification
                if ($salesLeads->isNotEmpty()) {
                    $lead = $salesLeads->first();
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_LEAD_ASSIGNED,
                        'title' => 'Khách hàng mới được giao',
                        'body' => "Bạn được giao khách hàng: {$lead->full_name}",
                        'content' => "Manager {$manager->name} đã giao khách hàng {$lead->full_name} cho bạn",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'assigned_by' => $manager->id,
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(2),
                    ]);
                    $notifCount++;
                }

                // 2. Task assigned notification
                $tasks = Task::where('assigned_to', $sales->id)
                    ->where('created_by', '!=', $sales->id)
                    ->take(2)->get();
                foreach ($tasks as $task) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_TASK_ASSIGNED,
                        'title' => 'Công việc mới',
                        'body' => "Bạn có công việc mới: {$task->title}",
                        'content' => "Bạn được giao công việc: {$task->title}",
                        'payload' => [
                            'task_id' => $task->id,
                            'lead_id' => $task->lead_id,
                        ],
                        'is_read' => rand(0, 1),
                        'created_at' => now()->subHours(rand(1, 48)),
                    ]);
                    $notifCount++;
                }

                // 3. Task reminder notification (due soon)
                $dueSoonTasks = Task::where('assigned_to', $sales->id)
                    ->whereDate('due_date', now())
                    ->take(1)->get();
                foreach ($dueSoonTasks as $task) {
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_TASK_REMINDER,
                        'title' => '⏰ Nhắc nhở công việc',
                        'body' => "Công việc \"{$task->title}\" đến hạn hôm nay",
                        'content' => "Công việc \"{$task->title}\" đến hạn hôm nay, hãy hoàn thành sớm",
                        'payload' => [
                            'task_id' => $task->id,
                            'due_date' => $task->due_date,
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(1),
                    ]);
                    $notifCount++;
                }

                // 4. Task overdue notification
                $overdueTasks = Task::where('assigned_to', $sales->id)
                    ->whereDate('due_date', '<', now())
                    ->where('status', '!=', Task::STATUS_DONE)
                    ->take(1)->get();
                foreach ($overdueTasks as $task) {
                    $daysOverdue = now()->diffInDays($task->due_date);
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_TASK_OVERDUE,
                        'title' => '🚨 Công việc quá hạn',
                        'body' => "Công việc \"{$task->title}\" đã quá hạn {$daysOverdue} ngày",
                        'content' => "Công việc \"{$task->title}\" đã quá hạn {$daysOverdue} ngày. Vui lòng hoàn thành ngay!",
                        'payload' => [
                            'task_id' => $task->id,
                            'days_overdue' => $daysOverdue,
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(3),
                    ]);
                    $notifCount++;
                }

                // 5. No follow-up notification (stale leads)
                $staleLeads = Lead::where('assigned_to', $sales->id)
                    ->where('status', Lead::STATUS_INTERESTED)
                    ->where('last_activity_at', '<', now()->subDays(7))
                    ->take(1)->get();
                foreach ($staleLeads as $lead) {
                    $daysSince = $lead->last_activity_at ? now()->diffInDays($lead->last_activity_at) : 0;
                    Notification::create([
                        'user_id' => $sales->id,
                        'type' => Notification::TYPE_NO_FOLLOW_UP,
                        'title' => '⚠️ Khách hàng cần follow-up',
                        'body' => "Khách hàng {$lead->full_name} chưa có hoạt động {$daysSince} ngày",
                        'content' => "Khách hàng \"{$lead->full_name}\" đang ở trạng thái Quan tâm nhưng chưa có hoạt động trong {$daysSince} ngày qua",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'days_since_activity' => $daysSince,
                        ],
                        'is_read' => false,
                        'created_at' => now()->subHours(6),
                    ]);
                    $notifCount++;
                }

                // 6. Status change notification (for manager)
                $qualifiedLeads = Lead::where('assigned_to', $sales->id)
                    ->where('status', Lead::STATUS_QUALIFIED)
                    ->take(1)->get();
                foreach ($qualifiedLeads as $lead) {
                    Notification::create([
                        'user_id' => $manager->id,
                        'type' => Notification::TYPE_STATUS_CHANGE,
                        'title' => '📈 Khách hàng có nhu cầu mới',
                        'body' => "{$lead->full_name} chuyển sang trạng thái Có nhu cầu",
                        'content' => "Sales {$sales->name} đã cập nhật khách hàng {$lead->full_name} sang trạng thái \"Có nhu cầu\"",
                        'payload' => [
                            'lead_id' => $lead->id,
                            'old_status' => Lead::STATUS_INTERESTED,
                            'new_status' => Lead::STATUS_QUALIFIED,
                            'changed_by' => $sales->id,
                        ],
                        'is_read' => rand(0, 1),
                        'created_at' => now()->subHours(rand(1, 24)),
                    ]);
                    $notifCount++;
                }
            }
        }

        $this->command->info("  ✓ Created {$notifCount} notifications");
    }

    private function createOpportunitiesForPipeline(): void
    {
        $this->command->info('💰 Creating opportunities for pipeline...');

        // Stages: PROSPECTING, PROPOSAL, NEGOTIATION, WON, LOST (from migration)
        $stages = ['PROSPECTING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        $stageProb = [20, 40, 70, 100, 0];
        
        $opportunityCount = 0;

        // Create opportunities from QUALIFIED and WON leads
        $eligibleLeads = Lead::whereIn('status', [Lead::STATUS_QUALIFIED, Lead::STATUS_WON])->get();

        foreach ($eligibleLeads as $lead) {
            $sales = User::find($lead->assigned_to);
            $manager = $sales ? User::find($sales->manager_id) : null;
            
            // Determine stage based on lead status
            if ($lead->status === Lead::STATUS_WON) {
                $stageIndex = 3; // WON
            } else {
                $stageIndex = rand(0, 2); // PROSPECTING to NEGOTIATION
            }

            $stage = $stages[$stageIndex];
            $probability = $stageProb[$stageIndex];
            $estimatedValue = $lead->budget ?? rand(50, 500) * 1000000;
            $expectedRevenue = $estimatedValue * ($probability / 100);

            $opportunity = Opportunity::create([
                'lead_id' => $lead->id,
                'owner_id' => $manager ? $manager->id : $sales->id,
                'stage' => $stage,
                'probability' => $probability,
                'estimated_value' => $estimatedValue,
                'expected_revenue' => $expectedRevenue,
                'currency_code' => 'VND',
                'expected_close_date' => now()->addDays(rand(7, 90)),
                'next_step' => $this->getNextStep($stage),
                'decision_criteria' => 'Giá cả, chất lượng, thời gian triển khai',
                'competitor' => rand(0, 1) ? 'Đối thủ A, Đối thủ B' : null,
                'stage_updated_at' => now()->subDays(rand(1, 10)),
                'created_at' => $lead->created_at,
            ]);

            // Create stage history
            $this->createStageHistory($opportunity, $stage, $manager ? $manager->id : $sales->id);
            
            $opportunityCount++;
        }

        // Create some additional LOST opportunities for testing
        $lostLeads = Lead::where('status', Lead::STATUS_LOST)->take(5)->get();
        foreach ($lostLeads as $lead) {
            $sales = User::find($lead->assigned_to);
            $manager = $sales ? User::find($sales->manager_id) : null;

            $opportunity = Opportunity::create([
                'lead_id' => $lead->id,
                'owner_id' => $manager ? $manager->id : $sales->id,
                'stage' => 'LOST',
                'probability' => 0,
                'estimated_value' => $lead->budget ?? rand(50, 200) * 1000000,
                'expected_revenue' => 0,
                'currency_code' => 'VND',
                'expected_close_date' => now()->subDays(rand(1, 30)),
                'next_step' => 'Đã đóng - Không có nhu cầu',
                'decision_criteria' => 'Ngân sách không phù hợp',
                'stage_updated_at' => now()->subDays(rand(1, 15)),
                'created_at' => $lead->created_at,
            ]);

            $this->createStageHistory($opportunity, 'LOST', $manager ? $manager->id : $sales->id);
            $opportunityCount++;
        }

        $this->command->info("  ✓ Created {$opportunityCount} opportunities");
    }

    private function createStageHistory($opportunity, $currentStage, $userId): void
    {
        // Stages: PROSPECTING, PROPOSAL, NEGOTIATION, WON, LOST
        $stages = ['PROSPECTING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        $stageIndex = array_search($currentStage, $stages);
        
        $prevStage = null;
        for ($i = 0; $i <= min($stageIndex, 2); $i++) {
            if ($currentStage === 'LOST' && $i > 1) break;
            
            OpportunityStageHistory::create([
                'opportunity_id' => $opportunity->id,
                'changed_by' => $userId,
                'from_stage' => $prevStage,
                'to_stage' => $stages[$i],
                'probability' => [20, 40, 70][$i] ?? 0,
                'changed_at' => $opportunity->created_at->copy()->addDays($i * 3),
            ]);
            $prevStage = $stages[$i];
        }

        if (in_array($currentStage, ['WON', 'LOST'])) {
            OpportunityStageHistory::create([
                'opportunity_id' => $opportunity->id,
                'changed_by' => $userId,
                'from_stage' => $prevStage,
                'to_stage' => $currentStage,
                'probability' => $currentStage === 'WON' ? 100 : 0,
                'changed_at' => now()->subDays(rand(1, 5)),
            ]);
        }
    }

    // Helper methods
    private function getVietnameseName(int $index): string
    {
        $ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
        $demTen = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Quốc', 'Thanh', 'Ngọc'];
        $ten = ['An', 'Bình', 'Châu', 'Dung', 'Em', 'Phúc', 'Giang', 'Hải', 'Khánh', 'Linh', 'Mai', 'Nam', 'Oanh', 'Phong', 'Quang', 'Sơn', 'Tâm', 'Uyên', 'Việt', 'Xuân'];
        
        return $ho[$index % count($ho)] . ' ' . $demTen[$index % count($demTen)] . ' ' . $ten[$index % count($ten)];
    }

    private function getCompanyName(int $index): string
    {
        $prefixes = ['Công ty', 'Doanh nghiệp', 'Tập đoàn', 'TNHH', 'Cổ phần'];
        $names = ['Phát Đạt', 'Thành Công', 'Hưng Thịnh', 'An Phú', 'Minh Quang', 'Việt Tiến', 'Đông Á', 'Nam Việt', 'Tây Nguyên', 'Bắc Hà'];
        
        return $prefixes[$index % count($prefixes)] . ' ' . $names[$index % count($names)] . ' ' . ($index % 100);
    }

    private function getAddress(string $teamName): string
    {
        if (str_contains($teamName, 'Hà Nội')) {
            $districts = ['Hoàn Kiếm', 'Ba Đình', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân'];
            return rand(1, 200) . ' Đường ' . chr(65 + rand(0, 25)) . ', ' . $districts[array_rand($districts)] . ', Hà Nội';
        }
        $districts = ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình'];
        return rand(1, 200) . ' Đường ' . chr(65 + rand(0, 25)) . ', ' . $districts[array_rand($districts)] . ', TP.HCM';
    }

    private function getLeadNote(string $status): string
    {
        return match($status) {
            Lead::STATUS_LEAD_NEW => 'Khách hàng mới, chưa liên hệ',
            Lead::STATUS_CONTACTED => 'Đã gọi điện, khách nghe máy và hẹn gọi lại',
            Lead::STATUS_INTERESTED => 'Khách quan tâm, đang tìm hiểu sản phẩm',
            Lead::STATUS_QUALIFIED => 'Khách yêu cầu báo giá, có nhu cầu rõ ràng',
            Lead::STATUS_WON => 'Đã chốt deal thành công',
            Lead::STATUS_LOST => 'Khách từ chối, không phù hợp ngân sách',
            default => 'Ghi chú mặc định',
        };
    }

    private function getScoreByStatus(string $status): int
    {
        return match($status) {
            Lead::STATUS_LEAD_NEW => rand(10, 30),
            Lead::STATUS_CONTACTED => rand(25, 45),
            Lead::STATUS_INTERESTED => rand(40, 60),
            Lead::STATUS_QUALIFIED => rand(60, 85),
            Lead::STATUS_WON => rand(85, 100),
            Lead::STATUS_LOST => rand(5, 25),
            default => 50,
        };
    }

    private function getNoteTitle(string $status): string
    {
        $titles = [
            'Ghi chú cuộc gọi',
            'Kết quả trao đổi',
            'Thông tin bổ sung',
            'Yêu cầu của khách',
            'Phản hồi khách hàng',
        ];
        return $titles[array_rand($titles)];
    }

    private function getNoteContent(string $status, int $index): string
    {
        $contents = [
            "Đã gọi điện, khách hàng quan tâm đến sản phẩm. Hẹn gọi lại vào tuần sau.",
            "Khách hỏi về giá và các gói dịch vụ. Đã gửi email báo giá.",
            "Khách muốn xem demo sản phẩm. Đã hẹn lịch demo online.",
            "Khách đang so sánh với đối thủ. Cần follow-up để thuyết phục.",
            "Khách hài lòng với demo, đang chờ quyết định từ ban lãnh đạo.",
        ];
        return $contents[$index % count($contents)];
    }

    private function getManagerNoteContent($lead): string
    {
        return "⚠️ GHI CHÚ QUẢN LÝ (Chỉ Manager xem được)\n\n" .
            "Khách hàng: {$lead->full_name}\n" .
            "Công ty: {$lead->company}\n" .
            "Budget dự kiến: " . number_format($lead->budget ?? 0) . " VND\n\n" .
            "📌 Đánh giá: Khách hàng tiềm năng cao, cần ưu tiên chăm sóc.\n" .
            "📌 Chiến lược: Giảm giá 10% nếu chốt trong tuần này.\n" .
            "📌 Lưu ý: Không chia sẻ thông tin này với Sales.";
    }

    private function getActivityChainByStatus(string $status): array
    {
        // Activity types: CALL, NOTE, TASK (per migration)
        $base = [
            ['type' => 'CALL', 'title' => 'Cuộc gọi đầu tiên', 'content' => 'Đã gọi điện giới thiệu cho {name}'],
        ];

        if (in_array($status, [Lead::STATUS_INTERESTED, Lead::STATUS_QUALIFIED, Lead::STATUS_WON])) {
            $base[] = ['type' => 'NOTE', 'title' => 'Ghi chú follow-up', 'content' => 'Khách {name} quan tâm, cần theo dõi'];
            $base[] = ['type' => 'CALL', 'title' => 'Cuộc gọi follow-up', 'content' => 'Gọi lại {name} để trao đổi chi tiết'];
        }

        if (in_array($status, [Lead::STATUS_QUALIFIED, Lead::STATUS_WON])) {
            $base[] = ['type' => 'TASK', 'title' => 'Gửi báo giá', 'content' => 'Đã gửi báo giá cho {name}'];
            $base[] = ['type' => 'NOTE', 'title' => 'Phản hồi báo giá', 'content' => 'Khách {name} đồng ý với báo giá'];
        }

        if ($status === Lead::STATUS_WON) {
            $base[] = ['type' => 'NOTE', 'title' => 'Chốt deal', 'content' => '🎉 Đã chốt deal thành công với {name}'];
        }

        return $base;
    }

    private function getNextStep(string $stage): string
    {
        return match($stage) {
            'PROSPECTING' => 'Tìm hiểu nhu cầu và gửi proposal',
            'PROPOSAL' => 'Chờ phản hồi từ khách hàng về báo giá',
            'NEGOTIATION' => 'Thương lượng điều khoản hợp đồng',
            'WON' => 'Hoàn tất thủ tục ký hợp đồng',
            'LOST' => 'Đóng cơ hội',
            default => 'Theo dõi tiến độ',
        };
    }

    private function printTestAccounts(): void
    {
        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('                    📱 TÀI KHOẢN TEST                          ');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->info('  Password chung: 123456');
        $this->command->newLine();
        $this->command->info('  👑 ADMIN:');
        $this->command->info('     • admin@crm.test');
        $this->command->newLine();
        $this->command->info('  👔 MANAGER (Team Hà Nội):');
        $this->command->info('     • manager1@crm.test - Có thể xem tất cả data của team');
        $this->command->info('     • Quản lý: 3 sales');
        $this->command->newLine();
        $this->command->info('  👔 MANAGER (Team Sài Gòn):');
        $this->command->info('     • manager2@crm.test - Có thể xem tất cả data của team');
        $this->command->info('     • Quản lý: 2 sales');
        $this->command->newLine();
        $this->command->info('  👤 SALES (Team Hà Nội):');
        $this->command->info('     • sales.hn1@crm.test');
        $this->command->info('     • sales.hn2@crm.test');
        $this->command->info('     • sales.hn3@crm.test');
        $this->command->newLine();
        $this->command->info('  👤 SALES (Team Sài Gòn):');
        $this->command->info('     • sales.hcm1@crm.test');
        $this->command->info('     • sales.hcm2@crm.test');
        $this->command->info('═══════════════════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📊 DỮ LIỆU TEST:');
        $this->command->info('  • Khách hàng: Đủ 6 trạng thái (LEAD_NEW → WON/LOST)');
        $this->command->info('  • Ghi chú: Có cả normal notes và manager notes');
        $this->command->info('  • Công việc: Quá hạn, hôm nay, sắp tới, đã hoàn thành');
        $this->command->info('  • Hoạt động: CALL, NOTE, TASK với timeline');
        $this->command->info('  • Thông báo: Đủ các loại (giao việc, nhắc nhở, quá hạn...)');
        $this->command->info('  • Cơ hội: Đủ các stage của pipeline');
        $this->command->info('═══════════════════════════════════════════════════════════════');
    }
}
