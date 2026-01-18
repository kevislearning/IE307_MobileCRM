<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedSmallInteger('follow_up_sla_days')->default(3)->after('last_contact_at');
            $table->timestamp('last_follow_up_notified_at')->nullable()->after('follow_up_sla_days');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['follow_up_sla_days', 'last_follow_up_notified_at']);
        });
    }
};
