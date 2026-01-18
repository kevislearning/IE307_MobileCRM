<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskTemplate;
use Illuminate\Http\Request;

class TaskTemplateController extends Controller
{
    public function index()
    {
        return response()->json(['data' => TaskTemplate::orderBy('title')->get()]);
    }

    public function store(Request $request)
    {
        $this->authorizeManager();
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|in:CALL,MEET,NOTE,OTHER',
            'default_due_days' => 'nullable|integer|min:0|max:365',
        ]);

        $template = TaskTemplate::create($data);
        return response()->json(['data' => $template], 201);
    }

    public function update(Request $request, TaskTemplate $taskTemplate)
    {
        $this->authorizeManager();
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'type' => 'sometimes|nullable|in:CALL,MEET,NOTE,OTHER',
            'default_due_days' => 'sometimes|nullable|integer|min:0|max:365',
        ]);

        $taskTemplate->update($data);
        return response()->json(['data' => $taskTemplate]);
    }

    public function destroy(TaskTemplate $taskTemplate)
    {
        $this->authorizeManager();
        $taskTemplate->delete();
        return response()->noContent();
    }

    private function authorizeManager(): void
    {
        $user = auth()->user();
        if (!$user || !($user->isAdmin() || $user->isOwner())) {
            abort(403, 'Manager only');
        }
    }
}
