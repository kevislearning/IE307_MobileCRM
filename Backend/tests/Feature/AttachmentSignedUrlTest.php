<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentSignedUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_sign_and_signed_preview(): void
    {
        Storage::fake('public');
        $user = User::factory()->create([
            'password' => Hash::make('password123456'),
            'role' => 'admin',
        ]);

        // create file
        Storage::disk('public')->put('attachments/test.txt', 'hello');
        $attachment = Attachment::create([
            'file_name' => 'test.txt',
            'file_path' => 'attachments/test.txt',
            'file_type' => 'text/plain',
            'uploaded_by' => $user->id,
        ]);

        $token = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123456',
        ])->json('access_token');

        $sign = $this->postJson("/api/attachments/{$attachment->id}/sign", [], [
            'Authorization' => "Bearer $token",
        ])->assertOk()->json();

        $this->get($sign['url'])->assertOk();
    }
}
