<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:CALL,TASK,NOTE',
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
            'lead_id' => 'required|exists:leads,id',
            'happened_at' => 'nullable|date',
        ]);

        $lead = Lead::findOrFail($data['lead_id']);
        $this->authorize('view', $lead);

        $activity = Activity::create([
            'type'=>$data['type'],
            'title'=>$data['title'] ?? null,
            'content'=>$data['content'],
            'lead_id'=>$data['lead_id'],
            'user_id'=>Auth::id(),
            'happened_at' => $data['happened_at'] ?? now(),
        ]);

        $lead->update(['last_activity_at' => $activity->happened_at]);

        return $activity;
    }
}
