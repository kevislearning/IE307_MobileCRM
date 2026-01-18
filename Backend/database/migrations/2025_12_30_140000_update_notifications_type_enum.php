<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update enum to include new notification types
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM')");
    }
};
