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
        // Create teams table
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('manager_id')->constrained('users')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Add team_id to users table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('manager_id')->constrained('teams')->onDelete('set null');
        });

        // Add team_id to leads table for team-level visibility
        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('owner_id')->constrained('teams')->onDelete('set null');
        });

        // Add team_id to tasks table
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('team_id')->nullable()->after('lead_id')->constrained('teams')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('team_id');
        });

        Schema::dropIfExists('teams');
    }
};
