<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuthRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ProfileRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\RefreshToken;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Firebase\JWT\JWT;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function login(AuthRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error'=>'Unauthorized'],401);
        }

        $tokens = $this->issueTokens($user);
        
        // Ghi log token để phục vụ kiểm thử
        Log::info('Login successful for user: ' . $user->email);
        Log::info('Access Token: ' . $tokens['access_token']);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($tokens);
    }

    public function register(AuthRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => User::STAFF,
        ]);

        $tokens = $this->issueTokens($user);

        Log::info('Register successful for user: ' . $user->email);
        Log::info('Access Token: ' . $tokens['access_token']);

        return response()->json($tokens, 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load(['team', 'manager']);
        
        $userData = $user->toArray();
        
        // Thêm thông tin team để hiển thị
        if ($user->team) {
            $userData['team_name'] = $user->team->name;
        }
        
        // Với managers, thêm số lượng thành viên
        if ($user->isOwner() && $user->team_id) {
            $userData['team_member_count'] = User::where('team_id', $user->team_id)
                ->where('role', 'staff')
                ->count();
        }
        
        return response()->json([
            'user' => $userData,
        ]);
    }

    public function updateProfile(ProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());
        return response()->json(['user' => $user]);
    }

    public function logout(Request $request)
    {
        RefreshToken::where('user_id', $request->user()->id)
            ->update(['revoked' => true]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'logout',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return ['message' => 'Logged out'];
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        RefreshToken::where('user_id', $user->id)->update(['revoked' => true]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'change_password',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Password updated, please login again.']);
    }

    public function refresh(Request $request)
    {
        $request->validate([
            'refresh_token' => 'required|string',
        ]);

        $tokenHash = hash('sha256', $request->refresh_token);

        $storedToken = RefreshToken::where('token_hash', $tokenHash)
            ->where('revoked', false)
            ->first();

        if (!$storedToken || $storedToken->expires_at->isPast()) {
            optional($storedToken)->update(['revoked' => true]);
            return response()->json(['message' => 'Invalid refresh token'], 401);
        }

        $storedToken->update(['revoked' => true]);

        return response()->json($this->issueTokens($storedToken->user));
    }

    public function forgot(ForgotPasswordRequest $request)
    {
        $existing = DB::table('password_resets')->where('email', $request->email)->first();
        if ($existing && now()->diffInSeconds($existing->created_at) < 60) {
            return response()->json(['message' => 'Please wait before requesting another OTP'], 429);
        }
        $otp = random_int(100000, 999999);
        DB::table('password_resets')->updateOrInsert(
            ['email' => $request->email],
            ['otp' => (string) $otp, 'expires_at' => now()->addMinutes(10), 'used' => false, 'created_at' => now(), 'updated_at' => now()]
        );

        try {
            Mail::raw("Your OTP is: {$otp}", function ($m) use ($request) {
                $m->to($request->email)->subject('Password Reset OTP');
            });
        } catch (\Throwable $e) {
            Log::warning('Mail send failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'OTP generated and sent.']);
    }

    public function reset(ResetPasswordRequest $request)
    {
        $record = DB::table('password_resets')->where('email', $request->email)->where('used', false)->first();
        if (!$record) {
            return response()->json(['message' => 'Invalid OTP'], 400);
        }

        if (now()->gt($record->expires_at)) {
            DB::table('password_resets')->where('email', $request->email)->delete();
            return response()->json(['message' => 'OTP expired'], 400);
        }

        if ($request->otp !== $record->otp) {
            return response()->json(['message' => 'Invalid OTP'], 400);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_resets')->where('email', $request->email)->delete();
        RefreshToken::where('user_id', $user->id)->update(['revoked' => true]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'reset_password',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Password reset successful. Please login.']);
    }

    private function issueTokens(User $user): array
    {
        $accessToken = $this->generateAccessToken($user);
        $refreshToken = $this->generateRefreshToken($user);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => config('jwt.ttl'),
            'user' => $user,
        ];
    }

    private function generateAccessToken(User $user): string
    {
        $payload = [
            'iss' => config('jwt.issuer', config('app.url')),
            'sub' => $user->id,
            'role' => $user->role,
            'iat' => now()->timestamp,
            'exp' => now()->addSeconds((int) config('jwt.ttl', 900))->timestamp,
        ];

        return JWT::encode($payload, config('jwt.secret'), config('jwt.algo'));
    }

    private function generateRefreshToken(User $user): string
    {
        $plain = Str::random(64);

        RefreshToken::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => Carbon::now()->addSeconds((int) config('jwt.refresh_ttl', 2592000)),
        ]);

        return $plain;
    }
}



