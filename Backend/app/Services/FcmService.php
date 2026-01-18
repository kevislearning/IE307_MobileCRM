<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    public function send(array $tokens, string $title, string $body, array $data = []): void
    {
        $serverKey = config('services.fcm.server_key');
        if (empty($serverKey) || empty($tokens)) {
            return;
        }

        $payload = [
            'registration_ids' => array_values($tokens),
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => $data,
        ];

        try {
            Http::withToken($serverKey)
                ->post('https://fcm.googleapis.com/fcm/send', $payload);
        } catch (\Throwable $e) {
            Log::warning('FCM send failed: '.$e->getMessage());
        }
    }
}
