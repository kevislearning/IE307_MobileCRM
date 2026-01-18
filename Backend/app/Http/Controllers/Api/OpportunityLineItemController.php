<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OpportunityLineItemResource;
use App\Models\Opportunity;
use App\Models\OpportunityLineItem;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class OpportunityLineItemController extends Controller
{
    use AuthorizesRequests;

    public function index(Opportunity $opportunity)
    {
        $this->authorize('view', $opportunity);
        return OpportunityLineItemResource::collection($opportunity->lineItems()->orderBy('created_at')->get());
    }

    public function store(Request $request, Opportunity $opportunity)
    {
        $this->authorize('update', $opportunity);
        $data = $request->validate([
            'product_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
        ]);
        $data['total_price'] = $data['quantity'] * $data['unit_price'];

        $item = $opportunity->lineItems()->create($data);
        return new OpportunityLineItemResource($item);
    }

    public function update(Request $request, OpportunityLineItem $opportunityLineItem)
    {
        $this->authorize('update', $opportunityLineItem->opportunity);
        $data = $request->validate([
            'product_name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|integer|min:1',
            'unit_price' => 'sometimes|numeric|min:0',
        ]);

        if (isset($data['quantity']) || isset($data['unit_price'])) {
            $quantity = $data['quantity'] ?? $opportunityLineItem->quantity;
            $unitPrice = $data['unit_price'] ?? $opportunityLineItem->unit_price;
            $data['total_price'] = $quantity * $unitPrice;
        }

        $opportunityLineItem->update($data);
        return new OpportunityLineItemResource($opportunityLineItem);
    }

    public function destroy(OpportunityLineItem $opportunityLineItem)
    {
        $this->authorize('update', $opportunityLineItem->opportunity);
        $opportunityLineItem->delete();
        return response()->noContent();
    }
}
