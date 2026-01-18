<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => 'required|email',
            'otp' => 'required|digits:6',
            'password' => 'required|min:6',
        ];
    }
}
