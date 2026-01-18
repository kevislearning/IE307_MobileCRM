<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class OpportunitySeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            'PROSPECTING',
            'PROPOSAL',
            'NEGOTIATION',
            'WON',
            'LOST'
        ];

        $owners = DB::table('users')->whereIn('role', ['admin','owner'])->pluck('id');
        $ownerDefault = $owners->first() ?? 1;

        for ($i = 1; $i <= 10; $i++) {
            $stage = $stages[array_rand($stages)];
            $probability = match ($stage) {
                'PROSPECTING' => 10,
                'PROPOSAL' => 30,
                'NEGOTIATION' => 60,
                'WON' => 100,
                'LOST' => 0,
                default => 50,
            };
            $estimated = rand(1000, 50000);
            DB::table('opportunities')->insert([
                'lead_id' => rand(1, 10),
                'stage' => $stage,
                'probability' => $probability,
                'estimated_value' => $estimated,
                'expected_revenue' => $estimated * ($probability / 100),
                'currency_code' => 'VND',
                'expected_close_date' => Carbon::now()->addDays(rand(7, 60)),
                'next_step' => 'Follow up call',
                'decision_criteria' => 'Budget approved',
                'competitor' => 'Competitor A',
                'stage_updated_at' => now(),
                'owner_id' => $owners->random() ?: $ownerDefault,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
