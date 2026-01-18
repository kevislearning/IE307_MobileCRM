<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'description' => $this->description,
            'notes' => $this->notes,
            'status' => $this->status,
            'computed_status' => $this->computed_status,
            'due_date' => $this->due_date,
            'completed_at' => optional($this->completed_at)->toIso8601String(),
            'recurrence_type' => $this->recurrence_type,
            'recurrence_interval' => $this->recurrence_interval,
            'recurrence_end_date' => optional($this->recurrence_end_date)->toDateString(),
            'reminder_at' => optional($this->reminder_at)->toIso8601String(),
            'assigned_to' => $this->assigned_to,
            'assigned_user' => new UserResource($this->whenLoaded('assignedUser')),
            'lead' => new LeadResource($this->whenLoaded('lead')),
            'opportunity' => new OpportunityResource($this->whenLoaded('opportunity')),
            'created_by' => $this->created_by,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'subtasks' => TaskSubtaskResource::collection($this->whenLoaded('subtasks')),
            'history' => TaskHistoryResource::collection($this->whenLoaded('histories')),
            'tags' => TaskTagResource::collection($this->whenLoaded('tags')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
