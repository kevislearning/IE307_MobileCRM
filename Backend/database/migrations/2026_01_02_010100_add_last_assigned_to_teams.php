<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('last_assigned_user_id')->nullable()->after('manager_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropForeign(['last_assigned_user_id']);
            $table->dropColumn('last_assigned_user_id');
        });
    }
};
