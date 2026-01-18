<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AuthRequest extends FormRequest
{
    public function rules()
    {
        $rules = [
            'email' => 'required|email',
            'password' => 'required|min:6',
        ];

        if ($this->routeIs('auth.register')) {
            $rules['name'] = 'required|string|max:255';
        } else {
            $rules['name'] = 'sometimes|string|max:255';
        }

        return $rules;
    }
}
