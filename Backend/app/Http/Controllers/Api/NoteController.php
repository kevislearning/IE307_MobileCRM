<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Lead;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class NoteController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request, Lead $lead)
    {
        // Use LeadPolicy to check access
        $this->authorize('view', $lead);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $query = $lead->notes();

        // If user is sales (staff), only show normal notes (not manager notes)
        if ($user->isStaff()) {
            $query->normal();
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|max:2000',
            'lead_id' => 'required|exists:leads,id',
            'type' => 'sometimes|in:normal,manager'
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $lead = Lead::findOrFail($request->lead_id);

        // Use LeadPolicy to check access
        $this->authorize('view', $lead);

        // Only managers (admin/owner) can create manager notes
        $type = Note::TYPE_NORMAL;
        if ($user->isManager() && $request->type === Note::TYPE_MANAGER) {
            $type = Note::TYPE_MANAGER;
        }

        $note = Note::create([
            'title' => $request->title,
            'content' => $request->content,
            'lead_id' => $lead->id,
            'user_id' => $user->id,
            'type' => $type
        ]);

        // Create activity for note
        Activity::create([
            'type' => 'NOTE',
            'title' => $request->title,
            'content' => $request->content,
            'lead_id' => $lead->id,
            'user_id' => $user->id,
            'happened_at' => now(),
        ]);

        // Update lead's last_activity_at
        $lead->update(['last_activity_at' => now()]);

        return response()->json($note->load('user'), 201);
    }

    public function destroy(Note $note)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Only note owner or manager can delete
        if (!$user->isManager() && $note->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->delete();
        return response()->noContent();
    }
}
