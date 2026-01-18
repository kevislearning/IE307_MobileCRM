<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        User::factory()->create([
            'email' => 'admin@test.com',
            'password' => Hash::make('password123456'),
            'role' => 'admin',
        ]);
    }

    public function test_login_and_refresh(): void
    {
        $res = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password123456',
        ])->assertOk();

        $tokens = $res->json();
        $this->assertArrayHasKey('access_token', $tokens);
        $this->assertArrayHasKey('refresh_token', $tokens);

        $this->postJson('/api/refresh', [
            'refresh_token' => $tokens['refresh_token'],
        ])->assertOk()->assertJsonStructure(['access_token']);
    }

    public function test_forgot_and_reset(): void
    {
        Mail::fake();

        $this->postJson('/api/forgot', ['email' => 'admin@test.com'])
            ->assertOk();

        $otpRow = DB::table('password_reset_tokens')->where('email', 'admin@test.com')->first();
        $this->assertNotNull($otpRow);

        $otp = '000000';
        DB::table('password_reset_tokens')->where('email', 'admin@test.com')->update([
            'token' => hash('sha256', $otp),
            'created_at' => now(),
        ]);

        $this->postJson('/api/reset', [
            'email' => 'admin@test.com',
            'otp' => $otp,
            'password' => 'newpassword123456',
        ])->assertOk();

        $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'newpassword123456',
        ])->assertOk();
    }
}
