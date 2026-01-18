<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ActivitySeeder extends Seeder
{
    public function run(): void
    {
        $types = ['CALL','TASK','NOTE'];
        $staffs = DB::table('users')->where('role', 'staff')->pluck('id');
        $userDefault = $staffs->first() ?? 1;

        for ($i = 1; $i <= 10; $i++) {
            DB::table('activities')->insert([
                'lead_id' => rand(1, 10),
                'type' => $types[array_rand($types)],
                'content' => 'Activity note ' . $i,
                'user_id' => $staffs->random() ?: $userDefault,
                'happened_at' => now()->subDays(rand(0,5)),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
