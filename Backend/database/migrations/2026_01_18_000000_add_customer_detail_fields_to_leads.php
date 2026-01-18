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
        Schema::table('leads', function (Blueprint $table) {
            // Contact info
            $table->string('phone_secondary')->nullable()->after('phone_number');
            $table->string('website')->nullable()->after('phone_secondary');
            
            // Business info
            $table->enum('company_size', ['small', 'medium', 'enterprise'])->nullable()->after('company');
            $table->string('industry')->nullable()->after('company_size');
            
            // Potential value (calculated from company_size + industry)
            $table->enum('potential_value_level', ['low', 'medium', 'high'])->nullable()->after('budget');
            $table->bigInteger('potential_value_amount')->nullable()->after('potential_value_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn([
                'phone_secondary',
                'website',
                'company_size',
                'industry',
                'potential_value_level',
                'potential_value_amount'
            ]);
        });
    }
};
