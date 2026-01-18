<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class TeamSeeder extends Seeder
{
    public function run(): void
    {
        // Create Admin (no team)
        $admin = User::firstOrCreate(
            ['email' => 'admin@crm.test'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123456'),
                'role' => 'admin',
            ]
        );

        // Team 1: Sales Team Alpha
        $manager1 = User::firstOrCreate(
            ['email' => 'manager1@crm.test'],
            [
                'name' => 'Nguyễn Văn An',
                'password' => Hash::make('password123456'),
                'role' => 'owner',
            ]
        );

        $team1 = Team::firstOrCreate(
            ['name' => 'Team Alpha'],
            [
                'description' => 'Team bán hàng khu vực Hà Nội',
                'manager_id' => $manager1->id,
                'is_active' => true,
            ]
        );

        // Assign manager to team
        $manager1->update(['team_id' => $team1->id]);

        // Create sales for Team 1
        $sales1_1 = User::firstOrCreate(
            ['email' => 'sales1@crm.test'],
            [
                'name' => 'Trần Thị Bình',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager1->id,
                'team_id' => $team1->id,
            ]
        );
        $sales1_1->update(['manager_id' => $manager1->id, 'team_id' => $team1->id]);

        $sales1_2 = User::firstOrCreate(
            ['email' => 'sales2@crm.test'],
            [
                'name' => 'Lê Văn Cường',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager1->id,
                'team_id' => $team1->id,
            ]
        );
        $sales1_2->update(['manager_id' => $manager1->id, 'team_id' => $team1->id]);

        $sales1_3 = User::firstOrCreate(
            ['email' => 'sales3@crm.test'],
            [
                'name' => 'Phạm Thị Dung',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager1->id,
                'team_id' => $team1->id,
            ]
        );
        $sales1_3->update(['manager_id' => $manager1->id, 'team_id' => $team1->id]);

        // Team 2: Sales Team Beta
        $manager2 = User::firstOrCreate(
            ['email' => 'manager2@crm.test'],
            [
                'name' => 'Hoàng Văn Em',
                'password' => Hash::make('password123456'),
                'role' => 'owner',
            ]
        );

        $team2 = Team::firstOrCreate(
            ['name' => 'Team Beta'],
            [
                'description' => 'Team bán hàng khu vực TP.HCM',
                'manager_id' => $manager2->id,
                'is_active' => true,
            ]
        );

        // Assign manager to team
        $manager2->update(['team_id' => $team2->id]);

        // Create sales for Team 2
        $sales2_1 = User::firstOrCreate(
            ['email' => 'sales4@crm.test'],
            [
                'name' => 'Ngô Thị Phương',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager2->id,
                'team_id' => $team2->id,
            ]
        );
        $sales2_1->update(['manager_id' => $manager2->id, 'team_id' => $team2->id]);

        $sales2_2 = User::firstOrCreate(
            ['email' => 'sales5@crm.test'],
            [
                'name' => 'Đỗ Văn Giang',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager2->id,
                'team_id' => $team2->id,
            ]
        );
        $sales2_2->update(['manager_id' => $manager2->id, 'team_id' => $team2->id]);

        // Team 3: Sales Team Gamma
        $manager3 = User::firstOrCreate(
            ['email' => 'manager3@crm.test'],
            [
                'name' => 'Vũ Thị Hạnh',
                'password' => Hash::make('password123456'),
                'role' => 'owner',
            ]
        );

        $team3 = Team::firstOrCreate(
            ['name' => 'Team Gamma'],
            [
                'description' => 'Team bán hàng khu vực Đà Nẵng',
                'manager_id' => $manager3->id,
                'is_active' => true,
            ]
        );

        // Assign manager to team
        $manager3->update(['team_id' => $team3->id]);

        // Create sales for Team 3
        $sales3_1 = User::firstOrCreate(
            ['email' => 'sales6@crm.test'],
            [
                'name' => 'Bùi Văn Khoa',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager3->id,
                'team_id' => $team3->id,
            ]
        );
        $sales3_1->update(['manager_id' => $manager3->id, 'team_id' => $team3->id]);

        $sales3_2 = User::firstOrCreate(
            ['email' => 'sales7@crm.test'],
            [
                'name' => 'Trịnh Thị Lan',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager3->id,
                'team_id' => $team3->id,
            ]
        );
        $sales3_2->update(['manager_id' => $manager3->id, 'team_id' => $team3->id]);

        $sales3_3 = User::firstOrCreate(
            ['email' => 'sales8@crm.test'],
            [
                'name' => 'Lý Văn Minh',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
                'manager_id' => $manager3->id,
                'team_id' => $team3->id,
            ]
        );
        $sales3_3->update(['manager_id' => $manager3->id, 'team_id' => $team3->id]);

        $this->command->info('Created 3 teams with managers and sales members:');
        $this->command->info('- Team Alpha (Hà Nội): 1 manager + 3 sales');
        $this->command->info('- Team Beta (TP.HCM): 1 manager + 2 sales');
        $this->command->info('- Team Gamma (Đà Nẵng): 1 manager + 3 sales');
    }
}
