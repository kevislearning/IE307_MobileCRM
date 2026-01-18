<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->unsignedTinyInteger('probability')->default(50)->after('stage');
            $table->decimal('expected_revenue', 12, 2)->nullable()->after('estimated_value');
            $table->string('currency_code', 3)->default('VND')->after('expected_revenue');
            $table->text('next_step')->nullable()->after('expected_close_date');
            $table->text('decision_criteria')->nullable()->after('next_step');
            $table->text('competitor')->nullable()->after('decision_criteria');
            $table->timestamp('stage_updated_at')->nullable()->after('competitor');
        });
    }

    public function down(): void
    {
        Schema::table('opportunities', function (Blueprint $table) {
            $table->dropColumn([
                'probability',
                'expected_revenue',
                'currency_code',
                'next_step',
                'decision_criteria',
                'competitor',
                'stage_updated_at',
            ]);
        });
    }
};
