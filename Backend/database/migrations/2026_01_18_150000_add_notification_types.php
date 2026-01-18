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
        // Add TASK_REMINDER, STATUS_CHANGE, DEAL_WON, DEAL_LOST, OPPORTUNITY_STAGE to notification types
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE','TASK_REMINDER','STATUS_CHANGE','DEAL_WON','DEAL_LOST','OPPORTUNITY_STAGE')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('LEAD','TASK','SYSTEM','TASK_ASSIGNED','LEAD_ASSIGNED','NO_FOLLOW_UP','TASK_OVERDUE')");
    }
};
