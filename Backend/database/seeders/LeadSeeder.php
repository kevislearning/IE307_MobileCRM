<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Team;
use App\Models\User;

class LeadSeeder extends Seeder
{
    public function run(): void
    {
        $teams = Team::with(['manager', 'salesMembers'])->get();
        
        $sources = ['website', 'facebook', 'referral', 'cold_call', 'event'];
        // Updated statuses according to States.txt
        $statuses = ['LEAD_NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'WON', 'LOST'];
        
        $leadCount = 1;
        $usedPhones = [];
        $usedEmails = [];
        
        foreach ($teams as $team) {
            $manager = $team->manager;
            $salesMembers = $team->salesMembers;
            
            if ($salesMembers->isEmpty()) {
                continue;
            }
            
            // Create leads for each team (distributed among sales members)
            foreach (range(1, 8) as $i) {
                $assignedTo = $salesMembers->random();
                
                $phone = null;
                while (!$phone || isset($usedPhones[$phone])) {
                    $phone = '09' . str_pad((string) rand(0, 99999999), 8, '0', STR_PAD_LEFT);
                }
                $usedPhones[$phone] = true;

                $email = null;
                while (!$email || isset($usedEmails[$email])) {
                    $email = 'customer' . rand(1, 999999) . '@email.com';
                }
                $usedEmails[$email] = true;

                DB::table('leads')->insert([
                    'full_name' => "Khách hàng {$leadCount}",
                    'email' => $email,
                    'phone_number' => $phone,
                    'company' => "Công ty " . chr(64 + $leadCount),
                    'budget' => rand(5, 200) * 1000000,
                    'status' => $statuses[array_rand($statuses)],
                    'source' => $sources[array_rand($sources)],
                    'source_detail' => 'source_' . rand(1, 5),
                    'campaign' => 'campaign_' . rand(1, 3),
                    'score' => rand(10, 90),
                    'priority' => ['LOW', 'MEDIUM', 'HIGH'][array_rand(['LOW', 'MEDIUM', 'HIGH'])],
                    'custom_fields' => json_encode(['industry' => 'retail', 'size' => rand(1, 100)]),
                    'owner_id' => $assignedTo->id,
                    'assigned_to' => $assignedTo->id,
                    'assigned_by' => $manager->id,
                    'assigned_at' => now()->subDays(rand(1, 30)),
                    'team_id' => $team->id,
                    'last_activity_at' => rand(0, 1) ? now()->subDays(rand(1, 15)) : null,
                    'unread_by_owner' => rand(0, 1),
                    'created_at' => now()->subDays(rand(1, 60)),
                    'updated_at' => now(),
                ]);
                
                $leadCount++;
            }
        }
        
        $this->command->info("Created " . ($leadCount - 1) . " leads distributed across all teams");
    }
}
