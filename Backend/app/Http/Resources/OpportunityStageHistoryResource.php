<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityStageHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'from_stage' => $this->from_stage,
            'to_stage' => $this->to_stage,
            'probability' => $this->probability,
            'changed_at' => optional($this->changed_at)->toIso8601String(),
            'changed_by' => $this->changed_by,
            'changer' => new UserResource($this->whenLoaded('changer')),
        ];
    }
}
