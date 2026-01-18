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
        // First, update the enum for status to match CRM requirements
        Schema::table('leads', function (Blueprint $table) {
            $table->string('address')->nullable()->after('company');
            $table->text('note')->nullable()->after('address');
            $table->timestamp('last_contact_at')->nullable()->after('note');
        });

        // Change status enum - Drop and recreate
        DB::statement("ALTER TABLE leads MODIFY COLUMN status ENUM('LEAD', 'CONTACTED', 'CARING', 'PURCHASED', 'NO_NEED') DEFAULT 'LEAD'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['address', 'note', 'last_contact_at']);
        });

        DB::statement("ALTER TABLE leads MODIFY COLUMN status ENUM('NEW', 'CONTACTING', 'AGREEMENT', 'LOST') DEFAULT 'NEW'");
    }
};
