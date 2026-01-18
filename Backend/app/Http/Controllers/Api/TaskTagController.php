<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskTag;
use Illuminate\Http\Request;

class TaskTagController extends Controller
{
    public function index()
    {
        return response()->json(['data' => TaskTag::orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $tag = TaskTag::create($data);
        return response()->json(['data' => $tag], 201);
    }

    public function update(Request $request, TaskTag $taskTag)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:50',
            'color' => 'sometimes|nullable|string|max:20',
        ]);

        $taskTag->update($data);
        return response()->json(['data' => $taskTag]);
    }

    public function destroy(TaskTag $taskTag)
    {
        $taskTag->delete();
        return response()->noContent();
    }

    public function sync(Task $task, Request $request)
    {
        $data = $request->validate([
            'tag_ids' => 'array',
            'tag_ids.*' => 'exists:task_tags,id',
        ]);

        $task->tags()->sync($data['tag_ids'] ?? []);
        return response()->json(['data' => $task->tags()->get()]);
    }
}
