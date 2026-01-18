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
        // Update existing EMAIL, MESSAGE, MEETING to NOTE
        DB::table('activities')
            ->whereIn('type', ['EMAIL', 'MESSAGE', 'MEETING'])
            ->update(['type' => 'NOTE']);

        // Change ENUM to only allow CALL, TASK, NOTE
        DB::statement("ALTER TABLE activities MODIFY COLUMN type ENUM('CALL', 'TASK', 'NOTE') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE activities MODIFY COLUMN type ENUM('CALL', 'EMAIL', 'MESSAGE', 'MEETING', 'NOTE') NOT NULL");
    }
};
