<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('manager_id')->nullable()->after('role')->constrained('users');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('source')->nullable()->after('company');
            $table->foreignId('assigned_to')->nullable()->after('owner_id')->constrained('users');
            $table->foreignId('assigned_by')->nullable()->after('assigned_to')->constrained('users');
            $table->timestamp('assigned_at')->nullable()->after('assigned_by');
            $table->timestamp('last_activity_at')->nullable()->after('assigned_at');
        });

        // Normalize old status values to new enum set before altering
        DB::table('leads')->where('status', 'NEW')->update(['status' => 'LEAD']);
        DB::table('leads')->where('status', 'CONTACTED')->update(['status' => 'CONTACTING']);
        DB::table('leads')->where('status', 'DEAL')->update(['status' => 'INTERESTED']);
        DB::table('leads')->where('status', 'FAILED')->update(['status' => 'NO_NEED']);
        DB::table('leads')->whereNotIn('status', ['LEAD','CONTACTING','INTERESTED','NO_NEED','PURCHASED'])->update(['status' => 'LEAD']);

        // Update lead status enum to match spec
        DB::statement("ALTER TABLE leads MODIFY status ENUM('LEAD','CONTACTING','INTERESTED','NO_NEED','PURCHASED') DEFAULT 'LEAD'");
        DB::statement("ALTER TABLE leads MODIFY phone_number VARCHAR(255) NULL");
        DB::statement("ALTER TABLE leads MODIFY email VARCHAR(255) NULL");

        Schema::table('leads', function (Blueprint $table) {
            $table->unique('phone_number');
            $table->unique('email');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->enum('type', ['CALL','MEET','NOTE','OTHER'])->default('OTHER')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropUnique(['phone_number']);
            $table->dropUnique(['email']);
            $table->dropColumn(['source','assigned_to','assigned_by','assigned_at','last_activity_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manager_id');
        });

        // revert status enum to previous set
        DB::statement("ALTER TABLE leads MODIFY status ENUM('NEW','CONTACTING','AGREEMENT','LOST') DEFAULT 'NEW'");
    }
};
