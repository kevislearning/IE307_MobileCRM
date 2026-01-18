<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeadAssignmentLogSeeder extends Seeder
{
    public function run(): void
    {
        $leads = DB::table('leads')->get();
        $owners = DB::table('users')->whereIn('role', ['admin','owner'])->pluck('id');
        foreach ($leads as $lead) {
            DB::table('lead_assignment_logs')->insert([
                'lead_id' => $lead->id,
                'from_user_id' => null,
                'to_user_id' => $lead->assigned_to ?? $lead->owner_id,
                'assigned_by' => $owners->random(),
                'note' => 'Seed assignment',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
