<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'avatar' => 'sometimes|nullable|string|max:255',
            'notifications_enabled' => 'sometimes|boolean',
            'theme' => 'sometimes|string|in:light,dark,system',
            'language' => 'sometimes|string|in:vi,en',
        ];
    }
}
