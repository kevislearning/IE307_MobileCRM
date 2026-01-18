<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Update status enum according to States.txt specification:
     * 1. LEAD_NEW (Lead mới) - Chưa có tương tác
     * 2. CONTACTED (Đã liên hệ) - Có phản hồi, chưa rõ nhu cầu
     * 3. INTERESTED (Quan tâm) - Đang chăm sóc, cần follow-up
     * 4. QUALIFIED (Có nhu cầu) - Yêu cầu báo giá, hẹn demo ⚠️ Quan trọng
     * 5. WON (Đã mua) - Deal chốt
     * 6. LOST (Không nhu cầu) - Từ chối
     */
    public function up(): void
    {
        // Map old statuses to new ones
        DB::table('leads')->where('status', 'LEAD')->update(['status' => 'LEAD_NEW']);
        DB::table('leads')->where('status', 'CARING')->update(['status' => 'INTERESTED']);
        DB::table('leads')->where('status', 'PURCHASED')->update(['status' => 'WON']);
        DB::table('leads')->where('status', 'NO_NEED')->update(['status' => 'LOST']);
        
        // Update status enum to new values
        DB::statement("ALTER TABLE leads MODIFY COLUMN status ENUM('LEAD_NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'WON', 'LOST') DEFAULT 'LEAD_NEW'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Map new statuses back to old ones
        DB::table('leads')->where('status', 'LEAD_NEW')->update(['status' => 'LEAD']);
        DB::table('leads')->where('status', 'QUALIFIED')->update(['status' => 'INTERESTED']);
        DB::table('leads')->where('status', 'WON')->update(['status' => 'PURCHASED']);
        DB::table('leads')->where('status', 'LOST')->update(['status' => 'NO_NEED']);
        
        // Revert to old enum
        DB::statement("ALTER TABLE leads MODIFY COLUMN status ENUM('LEAD', 'CONTACTED', 'INTERESTED', 'CARING', 'PURCHASED', 'NO_NEED') DEFAULT 'LEAD'");
    }
};
