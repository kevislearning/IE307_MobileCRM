<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedSmallInteger('score')->default(0)->after('status');
            $table->enum('priority', ['LOW', 'MEDIUM', 'HIGH'])->default('MEDIUM')->after('score');
            $table->string('source_detail')->nullable()->after('source');
            $table->string('campaign')->nullable()->after('source_detail');
            $table->json('custom_fields')->nullable()->after('campaign');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['score', 'priority', 'source_detail', 'campaign', 'custom_fields']);
        });
    }
};
