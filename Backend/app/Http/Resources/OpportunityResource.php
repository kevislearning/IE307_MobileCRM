<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stage' => $this->stage,
            'probability' => $this->probability,
            'estimated_value' => $this->estimated_value,
            'expected_revenue' => $this->expected_revenue,
            'currency_code' => $this->currency_code,
            'expected_close_date' => $this->expected_close_date,
            'next_step' => $this->next_step,
            'decision_criteria' => $this->decision_criteria,
            'competitor' => $this->competitor,
            'stage_updated_at' => optional($this->stage_updated_at)->toIso8601String(),
            'owner_id' => $this->owner_id,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'lead_id' => $this->lead_id,
            'lead' => new LeadResource($this->whenLoaded('lead')),
            'line_items' => OpportunityLineItemResource::collection($this->whenLoaded('lineItems')),
            'stage_history' => OpportunityStageHistoryResource::collection($this->whenLoaded('stageHistories')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
