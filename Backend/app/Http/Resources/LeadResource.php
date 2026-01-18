<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'company' => $this->company,
            'budget' => $this->budget,
            'address' => $this->address,
            'note' => $this->note,
            'source' => $this->source,
            'source_detail' => $this->source_detail,
            'campaign' => $this->campaign,
            'status' => $this->status,
            'score' => $this->score,
            'priority' => $this->priority,
            'custom_fields' => $this->custom_fields,
            'owner_id' => $this->owner_id,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'assigned_to' => $this->assigned_to,
            'assignee' => new UserResource($this->whenLoaded('assignee')),
            'assigned_by' => $this->assigned_by,
            'assigned_at' => optional($this->assigned_at)->toIso8601String(),
            'last_activity_at' => optional($this->last_activity_at)->toIso8601String(),
            'last_contact_at' => optional($this->last_contact_at)->toIso8601String(),
            'unread_by_owner' => $this->unread_by_owner,
            'team_id' => $this->team_id,
            'follow_up_sla_days' => $this->follow_up_sla_days,
            'last_follow_up_notified_at' => optional($this->last_follow_up_notified_at)->toIso8601String(),
            'days_since_contact' => $this->getDaysSinceContact(),
            'follow_up_due' => $this->isFollowUpDue(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }

    private function getDaysSinceContact(): ?int
    {
        $last = $this->last_contact_at ?? $this->last_activity_at ?? $this->created_at;
        if (!$last) {
            return null;
        }
        return $last->diffInDays(now());
    }

    private function isFollowUpDue(): bool
    {
        $days = $this->getDaysSinceContact();
        if ($days === null) {
            return false;
        }
        $sla = $this->follow_up_sla_days ?? 3;
        return $days >= $sla;
    }
}
