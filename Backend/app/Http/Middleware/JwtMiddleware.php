<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $secret = config('jwt.secret');
        if (empty($secret)) {
            return response()->json(['message' => 'JWT secret is not configured'], 500);
        }

        try {
            $payload = JWT::decode($token, new Key($secret, config('jwt.algo')));
        } catch (ExpiredException $e) {
            return response()->json(['message' => 'Token expired'], 401);
        } catch (SignatureInvalidException|UnexpectedValueException $e) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $user = User::find($payload->sub ?? null);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        Auth::setUser($user);
        $request->attributes->add(['jwt_payload' => $payload]);

        return $next($request);
    }
}
