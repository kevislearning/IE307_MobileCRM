<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TaskTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            ['title' => 'Follow-up call', 'description' => 'Call customer for follow-up', 'type' => 'CALL', 'default_due_days' => 1],
            ['title' => 'Send proposal', 'description' => 'Prepare and send proposal', 'type' => 'OTHER', 'default_due_days' => 3],
            ['title' => 'Schedule meeting', 'description' => 'Book a meeting with customer', 'type' => 'MEET', 'default_due_days' => 2],
        ];

        foreach ($templates as $template) {
            DB::table('task_templates')->insert([
                'title' => $template['title'],
                'description' => $template['description'],
                'type' => $template['type'],
                'default_due_days' => $template['default_due_days'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
