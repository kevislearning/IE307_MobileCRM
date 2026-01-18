<?php

return [
    'secret' => env('JWT_SECRET', ''),
    'algo' => env('JWT_ALGO', 'HS256'),
    'ttl' => env('JWT_TTL', 900), // seconds
    'refresh_ttl' => env('JWT_REFRESH_TTL', 2592000), // seconds (30 days)
    'issuer' => env('JWT_ISSUER', env('APP_URL')),
];
