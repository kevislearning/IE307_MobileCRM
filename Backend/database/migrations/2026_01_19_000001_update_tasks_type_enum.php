<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update tasks table type ENUM to include all task types
        DB::statement("ALTER TABLE tasks MODIFY COLUMN type ENUM('CALL','MEETING','EMAIL','DEMO','FOLLOW_UP','NOTE','MEET','OTHER') DEFAULT 'OTHER'");
        
        // Also update task_templates if exists
        try {
            DB::statement("ALTER TABLE task_templates MODIFY COLUMN type ENUM('CALL','MEETING','EMAIL','DEMO','FOLLOW_UP','NOTE','MEET','OTHER') DEFAULT NULL");
        } catch (\Exception $e) {
            // Ignore if table doesn't exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE tasks MODIFY COLUMN type ENUM('CALL','MEET','NOTE','OTHER') DEFAULT 'OTHER'");
    }
};
