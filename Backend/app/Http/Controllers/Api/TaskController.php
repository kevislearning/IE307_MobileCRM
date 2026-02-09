<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\Notification;
use App\Models\TaskHistory;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaskController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Task::with(['assignedUser', 'lead', 'opportunity', 'creator', 'tags']);

        /** @var \App\Models\User $user */
        if ($user->isAdmin()) {
            // không lọc
        } elseif ($user->isOwner()) {
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            $query->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
        } else {
            $query->where('assigned_to', $user->id);
        }

        if ($status = $request->status) {
            $query->where('status', $status);
        }

        if ($leadId = $request->lead_id) {
            $query->where('lead_id', $leadId);
        }

        if ($when = $request->when) {
            if ($when === 'today') {
                $query->whereDate('due_date', now()->toDateString());
            } elseif ($when === 'overdue') {
                $query->whereDate('due_date', '<', now()->toDateString())
                      ->where('status', '!=', Task::STATUS_DONE);
            } elseif ($when === 'upcoming') {
                $query->whereDate('due_date', '>', now()->toDateString());
            }
        }
        if ($search = $request->input('q')) {
            $query->search($search)
                ->orWhereHas('tags', function($q) use ($search) {
                    $q->where('name', 'like', "%$search%");
                });
        }
        if ($tagIds = $request->input('tag_ids')) {
            $ids = is_array($tagIds) ? $tagIds : explode(',', $tagIds);
            $query->whereHas('tags', function($q) use ($ids) {
                $q->whereIn('task_tags.id', $ids);
            });
        }

        $perPage = (int) $request->get('per_page', 10);
        return TaskResource::collection($query->orderByDesc('created_at')->paginate($perPage));
    }

    public function store(TaskRequest $request)
    {
        $this->authorize('create', Task::class);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $data = $request->validated();

        // Manager có thể giao cho người khác, staff chỉ có thể giao cho mình
        if ($user->isOwner() && !empty($data['assigned_to'])) {
            // Giữ assigned_to từ request
        } elseif (!$user->isAdmin()) {
            $data['assigned_to'] = $user->id;
        } elseif (empty($data['assigned_to'])) {
            $data['assigned_to'] = $user->id;
        }

        $data['status'] = $data['status'] ?? Task::STATUS_IN_PROGRESS;
        $data['created_by'] = $user->id;
        if (($data['status'] ?? null) === Task::STATUS_DONE) {
            $data['completed_at'] = now();
        }

        // Đặt team_id từ lead nếu có
        if (!empty($data['lead_id'])) {
            $lead = Lead::find($data['lead_id']);
            if ($lead) {
                $data['team_id'] = $lead->team_id;
            }
        }

        $tagIds = $data['tag_ids'] ?? [];
        unset($data['tag_ids']);

        $task = Task::create($data);
        if ($tagIds) {
            $task->tags()->sync($tagIds);
        }
        $this->logHistory($task, $user->id, 'created', $data);

        // Tạo thông báo giao công việc (nếu giao cho user khác)
        $assignedTo = $data['assigned_to'];
        if ($assignedTo && $assignedTo != $user->id) {
            try {
                Notification::create([
                    'user_id' => $assignedTo,
                    'type' => Notification::TYPE_TASK_ASSIGNED,
                    'content' => "Bạn được giao công việc: {$task->title}",
                    'payload' => [
                        'task_id' => $task->id,
                        'lead_id' => $data['lead_id'] ?? null,
                        'assigned_by' => $user->id,
                        'assigned_by_name' => $user->name,
                    ],
                ]);
            } catch (\Exception $e) {
                // Ghi log lỗi nhưng không fail việc tạo task
                \Log::warning('Failed to create task assignment notification: ' . $e->getMessage());
            }
        }

        // Tạo activity cho việc giao công việc nếu có lead_id
        if (!empty($data['lead_id'])) {
            $assignedUser = $task->assignedUser;
            Activity::create([
                'type' => 'TASK',
                'title' => 'Giao công việc',
                'content' => "Công việc: {$task->title}" . ($assignedUser ? " - Giao cho: {$assignedUser->name}" : ""),
                'lead_id' => $data['lead_id'],
                'user_id' => $user->id,
                'happened_at' => now(),
            ]);

            // Cập nhật last_activity_at của lead
            $lead = Lead::find($data['lead_id']);
            if ($lead) {
                $lead->update(['last_activity_at' => now()]);
            }
        }

        return new TaskResource($task->load(['assignedUser', 'lead', 'opportunity', 'creator', 'subtasks', 'histories.user', 'tags']));
    }

    public function show(Task $task)
    {
        $this->authorize('view', $task);
        return new TaskResource($task->load(['assignedUser', 'lead', 'opportunity', 'creator', 'subtasks', 'histories.user', 'tags']));
    }

    public function update(TaskRequest $request, Task $task)
    {
        $this->authorize('update', $task);
        $data = $request->validated();
        $user = Auth::user();

        /** @var \App\Models\User $user */
        if (!$user->isAdmin()) {
            $data['assigned_to'] = $user->id;
        }

        $tagIds = $data['tag_ids'] ?? null;
        unset($data['tag_ids']);

        // Kiểm tra nếu user đang đánh dấu task hoàn thành
        if (($data['status'] ?? null) === Task::STATUS_DONE && $task->status !== Task::STATUS_DONE) {
            // Chỉ user được giao mới có thể đánh dấu task hoàn thành
            $this->authorize('complete', $task);
            $data['completed_at'] = now();
        }

        $task->update($data);
        if (is_array($tagIds)) {
            $task->tags()->sync($tagIds);
        }
        $this->logHistory($task, $user->id, 'updated', $data);

        if (($data['status'] ?? null) === Task::STATUS_DONE) {
            $this->handleRecurrence($task);
            $this->logHistory($task, $user->id, 'completed', ['completed_at' => $task->completed_at]);
        }

        return new TaskResource($task->load(['assignedUser', 'lead', 'opportunity', 'creator', 'subtasks', 'histories.user', 'tags']));
    }

    public function destroy(Task $task)
    {
        $this->authorize('delete', $task);
        $task->delete();
        return response()->noContent();
    }

    private function handleRecurrence(Task $task): void
    {
        if (!$task->recurrence_type || !$task->due_date) {
            return;
        }

        $nextDue = Carbon::parse($task->due_date);
        $interval = max(1, (int) $task->recurrence_interval);

        if ($task->recurrence_type === 'DAILY') {
            $nextDue = $nextDue->addDays($interval);
        } elseif ($task->recurrence_type === 'WEEKLY') {
            $nextDue = $nextDue->addWeeks($interval);
        } else {
            $nextDue = $nextDue->addMonths($interval);
        }

        if ($task->recurrence_end_date && $nextDue->gt(Carbon::parse($task->recurrence_end_date))) {
            return;
        }

        $newTask = $task->replicate([
            'status',
            'completed_at',
            'created_at',
            'updated_at',
        ]);
        $newTask->status = Task::STATUS_IN_PROGRESS;
        $newTask->completed_at = null;
        $newTask->due_date = $nextDue;
        $newTask->save();

        $this->logHistory($newTask, $task->created_by, 'recurrence_generated', [
            'from_task_id' => $task->id,
        ]);
    }

    private function logHistory(Task $task, ?int $userId, string $action, array $payload = []): void
    {
        TaskHistory::create([
            'task_id' => $task->id,
            'user_id' => $userId,
            'action' => $action,
            'payload' => $payload ?: null,
        ]);
    }
}
