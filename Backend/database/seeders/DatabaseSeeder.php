<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Use ComprehensiveTestSeeder for rich test data
        // This creates all users, teams, leads, tasks, activities, notes, notifications, opportunities
        $this->call([
            ComprehensiveTestSeeder::class,
        ]);

        // Optional: Uncomment to add task templates
        // $this->call([TaskTemplateSeeder::class]);
    }
}
