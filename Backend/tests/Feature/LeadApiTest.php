<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_leads()
    {
        $user = User::factory()->create();
        Lead::factory()->count(3)->create(['owner_id' => $user->id]);

        $response = $this->authenticate($user)
            ->getJson('/api/leads');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'full_name', 'email', 'status']
                ],
                'links',
                'meta'
            ]);
    }

    public function test_can_create_lead()
    {
        $user = User::factory()->create();

        $data = [
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'company' => 'Acme Inc',
            'status' => 'NEW',
        ];

        $response = $this->authenticate($user)
            ->postJson('/api/leads', $data);

        $response->assertStatus(201)
            ->assertJsonFragment(['full_name' => 'John Doe']);

        $this->assertDatabaseHas('leads', ['email' => 'john@example.com']);
    }

    public function test_can_search_leads()
    {
        $user = User::factory()->create();
        Lead::factory()->create(['owner_id' => $user->id, 'full_name' => 'Alice Smith']);
        Lead::factory()->create(['owner_id' => $user->id, 'full_name' => 'Bob Jones']);

        $response = $this->authenticate($user)
            ->getJson('/api/leads?search=Alice');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['full_name' => 'Alice Smith']);
    }

    public function test_can_show_lead()
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create(['owner_id' => $user->id]);

        $response = $this->authenticate($user)
            ->getJson("/api/leads/{$lead->id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $lead->id]);
    }

    public function test_post_to_show_lead_returns_405()
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create(['owner_id' => $user->id]);

        $response = $this->authenticate($user)
            ->postJson("/api/leads/{$lead->id}", []);

        $response->assertStatus(405);
    }

    public function test_can_update_lead()
    {
        $user = User::factory()->create();
        $lead = Lead::factory()->create(['owner_id' => $user->id]);

        $data = [
            'full_name' => 'Updated Name',
            'company' => 'Updated Company',
        ];

        $response = $this->authenticate($user)
            ->putJson("/api/leads/{$lead->id}", $data);

        $response->assertStatus(200)
            ->assertJsonFragment(['full_name' => 'Updated Name']);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'full_name' => 'Updated Name',
        ]);
    }
}
