<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'notifications_enabled')) {
                $table->boolean('notifications_enabled')->default(true)->after('role');
            }
            if (!Schema::hasColumn('users', 'theme')) {
                $table->string('theme')->default('system')->after('notifications_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'notifications_enabled')) {
                $table->dropColumn('notifications_enabled');
            }
            if (Schema::hasColumn('users', 'theme')) {
                $table->dropColumn('theme');
            }
        });
    }
};
