<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordReset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    /**
     * Send OTP to user's email
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        // Invalidate any existing OTPs
        PasswordReset::where('email', $request->email)
            ->where('used', false)
            ->update(['used' => true]);

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Create password reset record
        PasswordReset::create([
            'email' => $request->email,
            'otp' => $otp,
            'expires_at' => Carbon::now()->addMinutes(10)
        ]);

        // Send OTP via email (simplified - in production use proper mail templates)
        try {
            Mail::raw("Mã OTP của bạn là: {$otp}. Mã có hiệu lực trong 10 phút.", function ($message) use ($request) {
                $message->to($request->email)
                    ->subject('Khôi phục mật khẩu - CRM');
            });
        } catch (\Exception $e) {
            // Log error but still return success (for development)
            \Log::error('Failed to send OTP email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'OTP đã được gửi đến email của bạn',
            'otp' => app()->environment('local') ? $otp : null // Only show OTP in local/dev
        ]);
    }

    /**
     * Verify OTP
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6'
        ]);

        $passwordReset = PasswordReset::where('email', $request->email)
            ->where('otp', $request->otp)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$passwordReset) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn'
            ], 400);
        }

        return response()->json([
            'message' => 'OTP hợp lệ',
            'reset_token' => base64_encode($request->email . '|' . $request->otp)
        ]);
    }

    /**
     * Reset password with OTP
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'reset_token' => 'required|string',
            'password' => 'required|string|min:6|confirmed'
        ]);

        // Decode reset token
        $decoded = base64_decode($request->reset_token);
        $parts = explode('|', $decoded);

        if (count($parts) !== 2) {
            return response()->json(['message' => 'Token không hợp lệ'], 400);
        }

        [$email, $otp] = $parts;

        $passwordReset = PasswordReset::where('email', $email)
            ->where('otp', $otp)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$passwordReset) {
            return response()->json([
                'message' => 'Token không hợp lệ hoặc đã hết hạn'
            ], 400);
        }

        // Update user password
        $user = User::where('email', $email)->first();
        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false
        ]);

        // Mark OTP as used
        $passwordReset->markAsUsed();

        return response()->json([
            'message' => 'Mật khẩu đã được đặt lại thành công'
        ]);
    }

    /**
     * Change password (for logged in users)
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:6|confirmed'
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Mật khẩu hiện tại không chính xác'
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false
        ]);

        return response()->json([
            'message' => 'Mật khẩu đã được thay đổi thành công'
        ]);
    }
}
