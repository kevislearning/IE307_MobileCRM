<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class TaskRequest extends FormRequest
{
    public function rules()
    {
        if ($this->isMethod('post')) {
            return [
                'title' => 'required|string|max:255',
                'type' => 'nullable|in:CALL,MEETING,EMAIL,DEMO,FOLLOW_UP,NOTE,MEET,OTHER',
                'description' => 'nullable|string',
                'notes' => 'nullable|string',
                'lead_id' => 'nullable|exists:leads,id',
                'opportunity_id' => 'nullable|exists:opportunities,id',
                'due_date' => 'required|date',
                'status' => 'in:IN_PROGRESS,DONE,OVERDUE',
                'assigned_to' => 'nullable|exists:users,id',
                'recurrence_type' => 'nullable|in:DAILY,WEEKLY,MONTHLY',
                'recurrence_interval' => 'nullable|integer|min:1|max:30',
                'recurrence_end_date' => 'nullable|date',
                'reminder_at' => 'nullable|date',
                'tag_ids' => 'nullable|array',
                'tag_ids.*' => 'exists:task_tags,id',
            ];
        }

        return [
            'title' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|nullable|in:CALL,MEETING,EMAIL,DEMO,FOLLOW_UP,NOTE,MEET,OTHER',
            'description' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
            'lead_id' => 'sometimes|nullable|exists:leads,id',
            'opportunity_id' => 'sometimes|nullable|exists:opportunities,id',
            'due_date' => 'sometimes|required|date',
            'status' => 'sometimes|in:IN_PROGRESS,DONE,OVERDUE',
            'assigned_to' => 'sometimes|nullable|exists:users,id',
            'recurrence_type' => 'sometimes|nullable|in:DAILY,WEEKLY,MONTHLY',
            'recurrence_interval' => 'sometimes|nullable|integer|min:1|max:30',
            'recurrence_end_date' => 'sometimes|nullable|date',
            'reminder_at' => 'sometimes|nullable|date',
            'tag_ids' => 'sometimes|nullable|array',
            'tag_ids.*' => 'exists:task_tags,id',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'errors' => $validator->errors()
        ], 422));
    }
}
