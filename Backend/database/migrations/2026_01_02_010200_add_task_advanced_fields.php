<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->enum('recurrence_type', ['DAILY', 'WEEKLY', 'MONTHLY'])->nullable()->after('completed_at');
            $table->unsignedSmallInteger('recurrence_interval')->default(1)->after('recurrence_type');
            $table->date('recurrence_end_date')->nullable()->after('recurrence_interval');
            $table->timestamp('reminder_at')->nullable()->after('recurrence_end_date');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['recurrence_type', 'recurrence_interval', 'recurrence_end_date', 'reminder_at']);
        });
    }
};
