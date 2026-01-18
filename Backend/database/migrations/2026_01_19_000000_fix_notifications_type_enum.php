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
        // First, delete any invalid notification records that might cause ENUM issues
        DB::statement("DELETE FROM notifications WHERE type NOT IN ('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE','TASK_REMINDER','STATUS_CHANGE','DEAL_WON','DEAL_LOST','OPPORTUNITY_STAGE')");
        
        // Then update the ENUM to include all valid types
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE','TASK_REMINDER','STATUS_CHANGE','DEAL_WON','DEAL_LOST','OPPORTUNITY_STAGE') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep all types in case of rollback
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE','TASK_REMINDER','STATUS_CHANGE','DEAL_WON','DEAL_LOST','OPPORTUNITY_STAGE') NOT NULL");
    }
};
