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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('lead_id')->nullable()->constrained();
            $table->foreignId('opportunity_id')->nullable()->constrained();
            $table->date('due_date');
            $table->enum('status', ['IN_PROGRESS','DONE','OVERDUE'])->default('IN_PROGRESS');
            $table->foreignId('assigned_to')->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
