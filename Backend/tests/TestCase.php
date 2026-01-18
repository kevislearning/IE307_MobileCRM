<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Firebase\JWT\JWT;

abstract class TestCase extends BaseTestCase
{
    protected function authenticate(\App\Models\User $user)
    {
        $payload = [
            'iss' => config('jwt.issuer'),
            'sub' => $user->id,
            'iat' => time(),
            'exp' => time() + config('jwt.ttl')
        ];
        
        $token = JWT::encode($payload, config('jwt.secret'), config('jwt.algo'));
        
        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ]);
    }
}
