<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@crm.test'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123456'),
                'role' => 'admin',
            ]
        );

        // Specific Owner
        $owner = User::firstOrCreate(
            ['email' => 'owner@crm.test'],
            [
                'name' => 'Owner User',
                'password' => Hash::make('password123456'),
                'role' => 'owner',
            ]
        );

        // Specific Staff
        $staff = User::firstOrCreate(
            ['email' => 'staff@crm.test'],
            [
                'name' => 'Staff User',
                'password' => Hash::make('password123456'),
                'role' => 'staff',
            ]
        );

        // Owners
        $owners = User::factory()->count(2)->create([
            'role' => 'owner',
        ]);

        // Staffs with manager assignment
        $ownerIds = collect([$owner->id])->merge($owners->pluck('id'))->values();
        $staffs = User::factory()->count(6)->create([
            'role' => 'staff',
            'manager_id' => $ownerIds->random(),
        ]);

        // Ensure predefined staff linked to first owner
        $staff->manager_id = $ownerIds->first();
        $staff->save();

        // Custom test user - Sales in Team 2
        User::firstOrCreate(
            ['email' => 'tduongtanphuoc1999@gmail.com'],
            [
                'name' => 'Tan Phuoc',
                'password' => Hash::make('pass123456'),
                'role' => 'staff',
                'team_id' => 2,
            ]
        );
    }
}
