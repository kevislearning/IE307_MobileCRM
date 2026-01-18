<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_merge_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('source_lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('merged_by')->constrained('users');
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_merge_logs');
    }
};
