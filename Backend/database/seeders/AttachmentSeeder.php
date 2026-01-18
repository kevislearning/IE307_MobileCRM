<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AttachmentSeeder extends Seeder
{
    public function run(): void
    {
        $fileTypes = ['image', 'pdf', 'doc'];

        for ($i = 1; $i <= 10; $i++) {
            DB::table('attachments')->insert([
                'file_name' => 'file_' . $i . '.pdf',
                'file_path' => 'uploads/files/file_' . $i . '.pdf',
                'file_type' => $fileTypes[array_rand($fileTypes)],
                'uploaded_by' => rand(1, 10),
                'lead_id' => rand(0, 1) ? rand(1, 10) : null,
                'task_id' => rand(0, 1) ? rand(1, 10) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
