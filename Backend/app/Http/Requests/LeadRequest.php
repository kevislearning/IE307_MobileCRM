<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'full_name'     => 'sometimes|string|max:255',
            'email'         => 'nullable|email',
            'phone_number'  => 'nullable|string|max:50',
            'company'       => 'nullable|string|max:255',
            'budget'        => 'nullable|numeric|min:0',
            'address'       => 'nullable|string|max:255',
            'note'          => 'nullable|string',
            'last_contact_at' => 'nullable|date',
            'source'        => 'nullable|string|max:255',
            'source_detail' => 'nullable|string|max:255',
            'campaign'      => 'nullable|string|max:255',
            'score'         => 'nullable|integer|min:0|max:100',
            'priority'      => 'nullable|in:LOW,MEDIUM,HIGH',
            'custom_fields' => 'nullable|array',
            'status'        => 'nullable|in:LEAD_NEW,CONTACTED,INTERESTED,QUALIFIED,WON,LOST',
            'owner_id'      => 'sometimes|exists:users,id',
            'assigned_to'   => 'sometimes|nullable|exists:users,id',
            'team_id'       => 'sometimes|nullable|exists:teams,id',
            'follow_up_sla_days' => 'sometimes|integer|min:1|max:365',
        ];

        // full_name is required only when creating a new lead
        if ($this->isMethod('POST')) {
            $rules['full_name'] = 'required|string|max:255';
        }

        return $rules;
    }
}
