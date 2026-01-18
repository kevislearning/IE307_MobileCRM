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
        Schema::table('users', function (Blueprint $table) {
            // Add phone and avatar columns
            $table->string('phone')->nullable()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            
            // Add first login flag for password change requirement
            $table->boolean('must_change_password')->default(false)->after('password');
            
            // Add settings for notifications
            $table->boolean('notifications_enabled')->default(true)->after('must_change_password');
            
            // Add language preference
            $table->enum('language', ['vi', 'en'])->default('vi')->after('notifications_enabled');
            
            // Add theme preference
            $table->enum('theme', ['light', 'dark', 'system'])->default('light')->after('language');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'avatar',
                'must_change_password',
                'notifications_enabled',
                'language',
                'theme'
            ]);
        });
    }
};
