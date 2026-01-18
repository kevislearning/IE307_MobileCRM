<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskSubtaskResource;
use App\Models\Task;
use App\Models\TaskSubtask;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaskSubtaskController extends Controller
{
    use AuthorizesRequests;

    public function index(Task $task)
    {
        $this->authorize('view', $task);
        return TaskSubtaskResource::collection($task->subtasks()->orderBy('created_at')->get());
    }

    public function store(Request $request, Task $task)
    {
        $this->authorize('update', $task);
        $data = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $subtask = $task->subtasks()->create($data);
        return new TaskSubtaskResource($subtask);
    }

    public function update(Request $request, TaskSubtask $subtask)
    {
        $this->authorize('update', $subtask->task);
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'is_done' => 'sometimes|boolean',
        ]);

        $subtask->update($data);
        return new TaskSubtaskResource($subtask);
    }

    public function destroy(TaskSubtask $subtask)
    {
        $this->authorize('update', $subtask->task);
        $subtask->delete();
        return response()->noContent();
    }
}
