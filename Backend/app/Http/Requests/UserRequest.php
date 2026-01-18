<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    public function rules()
    {
        $id = $this->user?->id ?? null;
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email'.($id ? ",$id" : ''),
            'password' => $this->isMethod('post') ? 'required|min:6' : 'nullable|min:6',
            'role' => 'required|in:admin,owner,staff',
            'manager_id' => 'nullable|exists:users,id',
        ];
    }
}
