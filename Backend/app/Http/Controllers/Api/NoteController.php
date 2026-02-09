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
        // Sử dụng LeadPolicy để kiểm tra quyền truy cập
        $this->authorize('view', $lead);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $query = $lead->notes();

        // Nếu user là sales (staff), chỉ hiển thị notes thường (không phải note của manager)
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

        // Sử dụng LeadPolicy để kiểm tra quyền truy cập
        $this->authorize('view', $lead);

        // Chỉ managers (admin/owner) mới có thể tạo manager notes
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

        // Tạo activity cho note
        Activity::create([
            'type' => 'NOTE',
            'title' => $request->title,
            'content' => $request->content,
            'lead_id' => $lead->id,
            'user_id' => $user->id,
            'happened_at' => now(),
        ]);

        // Cập nhật last_activity_at của lead
        $lead->update(['last_activity_at' => now()]);

        return response()->json($note->load('user'), 201);
    }

    public function destroy(Note $note)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Chỉ chủ note hoặc manager mới có thể xóa
        if (!$user->isManager() && $note->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $note->delete();
        return response()->noContent();
    }
}
