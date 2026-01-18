<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;

class AttachmentUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_user_can_upload_attachment_to_any_lead()
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'owner']);
        $otherUser = User::factory()->create(['role' => 'staff']);
        
        $lead = Lead::factory()->create(['owner_id' => $owner->id]);

        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->authenticate($otherUser)->postJson('/api/attachments', [
            'file' => $file,
            'lead_id' => $lead->id,
        ]);

        $response->assertStatus(201);
        $this->assertTrue(Storage::disk('public')->exists('attachments/' . $file->hashName()));
    }
}
