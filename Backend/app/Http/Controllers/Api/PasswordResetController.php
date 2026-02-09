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
     * Gửi OTP đến email của người dùng
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        // Vô hiệu hóa các OTP hiện có
        PasswordReset::where('email', $request->email)
            ->where('used', false)
            ->update(['used' => true]);

        // Tạo OTP 6 chữ số
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Tạo bản ghi reset mật khẩu
        PasswordReset::create([
            'email' => $request->email,
            'otp' => $otp,
            'expires_at' => Carbon::now()->addMinutes(10)
        ]);

        // Gửi OTP qua email (đơn giản - trong production nên dùng mail templates đầy đủ)
        try {
            Mail::raw("Mã OTP của bạn là: {$otp}. Mã có hiệu lực trong 10 phút.", function ($message) use ($request) {
                $message->to($request->email)
                    ->subject('Khôi phục mật khẩu - CRM');
            });
        } catch (\Exception $e) {
            // Ghi log lỗi nhưng vẫn trả về thành công (cho development)
            \Log::error('Failed to send OTP email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'OTP đã được gửi đến email của bạn',
            'otp' => app()->environment('local') ? $otp : null // Chỉ hiển thị OTP trong local/dev
        ]);
    }

    /**
     * Xác minh OTP
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
     * Đặt lại mật khẩu với OTP
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'reset_token' => 'required|string',
            'password' => 'required|string|min:6|confirmed'
        ]);

        // Giải mã reset token
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

        // Cập nhật mật khẩu user
        $user = User::where('email', $email)->first();
        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false
        ]);

        // Đánh dấu OTP đã sử dụng
        $passwordReset->markAsUsed();

        return response()->json([
            'message' => 'Mật khẩu đã được đặt lại thành công'
        ]);
    }

    /**
     * Đổi mật khẩu (cho user đã đăng nhập)
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
