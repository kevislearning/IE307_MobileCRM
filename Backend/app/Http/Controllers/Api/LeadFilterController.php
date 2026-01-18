<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeadFilter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeadFilterController extends Controller
{
    public function index()
    {
        return LeadFilter::where('user_id', Auth::id())
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'filters' => 'required|array',
            'is_default' => 'sometimes|boolean',
        ]);

        if (!empty($data['is_default'])) {
            LeadFilter::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        $filter = LeadFilter::create([
            'user_id' => Auth::id(),
            'name' => $data['name'],
            'filters' => $data['filters'],
            'is_default' => (bool) ($data['is_default'] ?? false),
        ]);

        return response()->json(['data' => $filter], 201);
    }

    public function update(Request $request, LeadFilter $leadFilter)
    {
        if ($leadFilter->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'filters' => 'sometimes|array',
            'is_default' => 'sometimes|boolean',
        ]);

        if (!empty($data['is_default'])) {
            LeadFilter::where('user_id', Auth::id())->update(['is_default' => false]);
        }

        $leadFilter->update($data);
        return response()->json(['data' => $leadFilter]);
    }

    public function destroy(LeadFilter $leadFilter)
    {
        if ($leadFilter->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $leadFilter->delete();
        return response()->noContent();
    }
}
