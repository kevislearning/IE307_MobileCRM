<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OpportunityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules()
    {
        if ($this->isMethod('post')) {
            return [
                'lead_id' => 'required|exists:leads,id',
                'stage' => 'required|in:PROSPECTING,PROPOSAL,NEGOTIATION,WON,LOST',
                'probability' => 'sometimes|integer|min:0|max:100',
                'estimated_value' => 'numeric',
                'expected_revenue' => 'nullable|numeric',
                'currency_code' => 'sometimes|string|size:3',
                'expected_close_date' => 'date',
                'next_step' => 'nullable|string',
                'decision_criteria' => 'nullable|string',
                'competitor' => 'nullable|string',
                'owner_id' => 'sometimes|exists:users,id',
            ];
        }

        return [
            'lead_id' => 'sometimes|exists:leads,id',
            'stage' => 'sometimes|in:PROSPECTING,PROPOSAL,NEGOTIATION,WON,LOST',
            'probability' => 'sometimes|integer|min:0|max:100',
            'estimated_value' => 'sometimes|numeric',
            'expected_revenue' => 'sometimes|nullable|numeric',
            'currency_code' => 'sometimes|string|size:3',
            'expected_close_date' => 'sometimes|date',
            'next_step' => 'sometimes|nullable|string',
            'decision_criteria' => 'sometimes|nullable|string',
            'competitor' => 'sometimes|nullable|string',
            'owner_id' => 'sometimes|exists:users,id',
        ];
    }
}
