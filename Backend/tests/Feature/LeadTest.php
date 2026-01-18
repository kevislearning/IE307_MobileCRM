<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LeadTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticate(): string
    {
        $user = User::factory()->create([
            'role' => 'admin',
            'password' => Hash::make('password123456'),
        ]);

        $res = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123456',
        ]);
        return $res->json('access_token');
    }

    public function test_lead_crud_and_duplicate_check(): void
    {
        $token = $this->authenticate();

        $create = $this->postJson('/api/leads', [
            'full_name' => 'Lead A',
            'email' => 'a@test.com',
            'phone_number' => '0900000001',
        ], ['Authorization' => "Bearer $token"])->assertCreated();

        $leadId = $create->json('data.id') ?? $create->json('id');
        $this->assertNotNull($leadId);

        // duplicate as staff should 409
        $staff = User::factory()->create(['role' => 'staff', 'password' => Hash::make('password123456')]);
        $staffToken = $this->postJson('/api/login', [
            'email' => $staff->email,
            'password' => 'password123456',
        ])->json('access_token');

        $this->postJson('/api/leads', [
            'full_name' => 'Lead dup',
            'email' => 'a@test.com',
        ], ['Authorization' => "Bearer $staffToken"])->assertStatus(409);

        // update status
        $this->putJson("/api/leads/{$leadId}", [
            'status' => 'CONTACTING',
        ], ['Authorization' => "Bearer $token"])->assertOk();
    }
}
