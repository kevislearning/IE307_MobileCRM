<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\BlockedContact;
use App\Models\Lead;
use App\Models\LeadAssignmentLog;
use App\Models\LeadMergeLog;
use App\Models\Notification;
use App\Models\UserDevice;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\Attachment;
use App\Models\Task;
use App\Models\Opportunity;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Auth;
use App\Services\FcmService;

class LeadController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $query = Lead::with(['owner','assignee']);

        // Phân quyền hiển thị theo role
        if ($user->isAdmin()) {
            // xem tất cả
        } elseif ($user->isOwner()) {
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            $query->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('owner_id', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
        } else {
            $query->where(function($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('owner_id', $user->id);
            });
        }

        // Bộ lọc
        $query->search($request->q ?? $request->search);
        if ($status = $request->status) {
            $query->where('status', $status);
        }
        if ($source = $request->source) {
            $query->where('source', $source);
        }
        if ($ownerId = $request->owner_id) {
            $query->where('owner_id', $ownerId);
        }
        if ($assigned = $request->assigned_to) {
            $query->where('assigned_to', $assigned);
        }
        if ($request->boolean('uncontacted')) {
            $query->whereNull('last_activity_at');
        }
        if ($stale = $request->stale_days) {
            $query->where(function($q) use ($stale) {
                $q->whereNull('last_activity_at')
                  ->orWhere('last_activity_at', '<', now()->subDays((int)$stale));
            });
        }
        if ($scoreMin = $request->input('score_min')) {
            $query->where('score', '>=', (int) $scoreMin);
        }
        if ($scoreMax = $request->input('score_max')) {
            $query->where('score', '<=', (int) $scoreMax);
        }
        if ($priority = $request->input('priority')) {
            $query->where('priority', $priority);
        }
        if ($budgetMin = $request->input('budget_min')) {
            $query->where('budget', '>=', (float) $budgetMin);
        }
        if ($budgetMax = $request->input('budget_max')) {
            $query->where('budget', '<=', (float) $budgetMax);
        }
        if ($sourceDetail = $request->input('source_detail')) {
            $query->where('source_detail', $sourceDetail);
        }
        if ($campaign = $request->input('campaign')) {
            $query->where('campaign', $campaign);
        }
        if ($lastActivityBefore = $request->input('last_activity_before')) {
            $query->whereDate('last_activity_at', '<=', $lastActivityBefore);
        }
        if ($lastActivityAfter = $request->input('last_activity_after')) {
            $query->whereDate('last_activity_at', '>=', $lastActivityAfter);
        }
        if ($request->boolean('follow_up_due')) {
            $query->whereNotNull('last_activity_at')
                ->whereRaw('last_activity_at < DATE_SUB(NOW(), INTERVAL IFNULL(follow_up_sla_days, 3) DAY)');
        }

        return LeadResource::collection($query->paginate(10));
    }

    public function store(LeadRequest $request)
    {
        $data = $request->validated();
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Kiểm tra contact bị chặn
        if (!empty($data['phone_number']) && BlockedContact::where('phone', $data['phone_number'])->exists()) {
            return response()->json(['message' => 'Phone is blocked'], 409);
        }
        if (!empty($data['email']) && BlockedContact::where('email', $data['email'])->exists()) {
            return response()->json(['message' => 'Email is blocked'], 409);
        }

        // anti-duplicate/tranh khách
        $existing = Lead::where(function($q) use ($data) {
            if (!empty($data['phone_number'])) {
                $q->orWhere('phone_number', $data['phone_number']);
            }
            if (!empty($data['email'])) {
                $q->orWhere('email', $data['email']);
            }
        })->first();

        if ($existing && !($user->isAdmin() || $user->isOwner())) {
            return response()->json([
                'message' => 'Lead already exists',
                'lead_id' => $existing->id
            ], 409);
        }

        $data['owner_id'] = $user->isAdmin() && isset($data['owner_id'])
            ? $data['owner_id']
            : $user->id;
        // Xử lý giao việc: chỉ admin/manager mới có thể giao cho người khác
        if (!empty($data['assigned_to']) && !($user->isAdmin() || $user->isOwner())) {
            $data['assigned_to'] = $user->id;
        }
        if (empty($data['assigned_to'])) {
            $data['assigned_to'] = $this->assignRoundRobin($data['team_id'] ?? $user->team_id) ?? $user->id;
        }
        if (!empty($data['assigned_to'])) {
            $data['assigned_by'] = $user->id;
            $data['assigned_at'] = now();
        }
        if (empty($data['team_id'])) {
            $assignedUser = User::find($data['assigned_to']);
            $data['team_id'] = $assignedUser?->team_id ?? $user->team_id;
        }
        $data['unread_by_owner'] = true;
        
        $lead = Lead::create($data);
        return new LeadResource($lead);
    }

    public function show(Lead $lead)
    {
        $this->authorize('view', $lead);
        return new LeadResource($lead->load(['owner','assignee']));
    }

    public function update(LeadRequest $request, Lead $lead)
    {
        $this->authorize('update', $lead);
        $oldStatus = $lead->status;
        $lead->update($request->validated());

        // Thông báo khi thay đổi trạng thái
        if ($request->filled('status') && $lead->status !== $oldStatus) {
            $targets = collect([$lead->assigned_to, $lead->owner_id])->filter()->unique();
            foreach ($targets as $userId) {
                Notification::create([
                    'user_id' => $userId,
                    'type' => 'LEAD',
                    'content' => "Lead {$lead->full_name} status changed to {$lead->status}",
                    'payload' => ['lead_id' => $lead->id, 'status' => $lead->status],
                ]);

                $tokens = UserDevice::where('user_id', $userId)->pluck('fcm_token')->toArray();
                app(FcmService::class)->send($tokens, 'Lead status updated', "{$lead->full_name}: {$lead->status}", ['lead_id' => $lead->id]);
            }
        }

        return new LeadResource($lead);
    }

    public function destroy(Lead $lead)
    {
        $this->authorize('delete', $lead);
        $lead->delete();
        return response()->noContent();
    }

    public function activities(Lead $lead)
    {
        $this->authorize('view', $lead);
        return $lead->activities()->with('user')->orderBy('created_at', 'desc')->get();
    }

    public function careHistory(Lead $lead)
    {
        $this->authorize('view', $lead);

        $activities = $lead->activities()
            ->selectRaw("DATE(COALESCE(happened_at, created_at)) as date, COUNT(*) as total")
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->get();

        $tasks = Task::where('lead_id', $lead->id)
            ->selectRaw("DATE(created_at) as date, COUNT(*) as total")
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->get();

        $activityMap = $activities->keyBy('date');
        $taskMap = $tasks->keyBy('date');
        $dates = $activities->pluck('date')->merge($tasks->pluck('date'))->unique()->sortDesc()->values();

        $history = $dates->map(function ($date) use ($activityMap, $taskMap) {
            return [
                'date' => $date,
                'activities' => (int) ($activityMap[$date]->total ?? 0),
                'tasks' => (int) ($taskMap[$date]->total ?? 0),
            ];
        });

        return response()->json(['data' => $history]);
    }

    public function timeline(Lead $lead)
    {
        $this->authorize('view', $lead);

        $activities = $lead->activities()->with('user')->get()->map(function ($activity) {
            return [
                'type' => 'ACTIVITY',
                'happened_at' => optional($activity->happened_at ?? $activity->created_at)->toIso8601String(),
                'data' => $activity,
            ];
        });

        $tasks = Task::where('lead_id', $lead->id)->with('assignedUser')->get()->map(function ($task) {
            return [
                'type' => 'TASK',
                'happened_at' => optional($task->created_at)->toIso8601String(),
                'data' => $task,
            ];
        });

        $attachments = Attachment::where('lead_id', $lead->id)->get()->map(function ($attachment) {
            return [
                'type' => 'ATTACHMENT',
                'happened_at' => optional($attachment->created_at)->toIso8601String(),
                'data' => $attachment,
            ];
        });

        $opportunities = Opportunity::where('lead_id', $lead->id)->get()->map(function ($opportunity) {
            return [
                'type' => 'OPPORTUNITY',
                'happened_at' => optional($opportunity->created_at)->toIso8601String(),
                'data' => $opportunity,
            ];
        });

        $timeline = $activities
            ->concat($tasks)
            ->concat($attachments)
            ->concat($opportunities)
            ->sortByDesc(function ($item) {
                return $item['happened_at'] ?? '';
            })
            ->values();

        return response()->json(['data' => $timeline]);
    }

    public function duplicates(Request $request)
    {
        $request->validate([
            'lead_id' => 'nullable|exists:leads,id',
            'email' => 'nullable|email',
            'phone_number' => 'nullable|string',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $leadId = $request->input('lead_id');
        $email = $request->input('email');
        $phone = $request->input('phone_number');

        if ($leadId) {
            $lead = Lead::findOrFail($leadId);
            $email = $lead->email;
            $phone = $lead->phone_number;
        }

        if (!$email && !$phone) {
            return LeadResource::collection(collect());
        }

        $query = Lead::query();
        if ($user->isAdmin()) {
            // không lọc
        } elseif ($user->isOwner()) {
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            $query->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('owner_id', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
        } else {
            $query->where(function($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('owner_id', $user->id);
            });
        }
        if ($email) {
            $query->orWhere('email', $email);
        }
        if ($phone) {
            $query->orWhere('phone_number', $phone);
        }
        if ($leadId) {
            $query->where('id', '!=', $leadId);
        }

        return LeadResource::collection($query->limit(20)->get());
    }

    public function assign(Request $request, Lead $lead)
    {
        $request->validate([
            'assigned_to' => 'required|exists:users,id',
        ]);

        $user = Auth::user();
        $targetId = (int) $request->assigned_to;

        if (!$user->isAdmin()) {
            // Manager có thể giao cho thành viên trong team hoặc cho chính mình
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            if (!in_array($targetId, $teamIds) && $targetId !== $user->id) {
                abort(403, 'Not allowed to assign this lead.');
            }
        }

        $lead->update([
            'assigned_to' => $targetId,
            'assigned_by' => $user->id,
            'assigned_at' => now(),
            'owner_id' => $lead->owner_id ?: $user->id,
        ]);

        LeadAssignmentLog::create([
            'lead_id' => $lead->id,
            'from_user_id' => $lead->assigned_to,
            'to_user_id' => $targetId,
            'assigned_by' => $user->id,
            'note' => $request->input('note'),
        ]);

        Notification::create([
            'user_id' => $targetId,
            'type' => 'LEAD',
            'content' => 'Bạn được giao khách: '.$lead->full_name,
            'payload' => ['lead_id' => $lead->id],
        ]);

        $tokens = UserDevice::where('user_id', $targetId)->pluck('fcm_token')->toArray();
        app(FcmService::class)->send($tokens, 'Lead assigned', $lead->full_name, ['lead_id' => $lead->id]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'lead_assign',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'payload' => ['lead_id' => $lead->id, 'to_user' => $targetId],
        ]);

        return new LeadResource($lead->fresh(['owner','assignee']));
    }

    public function merge(Request $request, Lead $lead)
    {
        $request->validate([
            'source_lead_id' => 'required|different:lead|exists:leads,id',
            'note' => 'nullable|string'
        ]);

        $user = Auth::user();
        if (!$user->isAdmin() && !$user->isOwner()) {
            abort(403, 'Only admin/manager can merge leads');
        }

        $source = Lead::findOrFail($request->source_lead_id);

        // Di chuyển activities/tasks/attachments
        \App\Models\Activity::where('lead_id', $source->id)->update(['lead_id' => $lead->id]);
        \App\Models\Task::where('lead_id', $source->id)->update(['lead_id' => $lead->id]);
        \App\Models\Attachment::where('lead_id', $source->id)->update(['lead_id' => $lead->id]);
        \App\Models\Opportunity::where('lead_id', $source->id)->update(['lead_id' => $lead->id]);

        LeadMergeLog::create([
            'target_lead_id' => $lead->id,
            'source_lead_id' => $source->id,
            'merged_by' => $user->id,
            'note' => $request->note,
        ]);

        $source->delete();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'lead_merge',
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'payload' => ['target_lead_id' => $lead->id, 'source_lead_id' => $source->id],
        ]);

        return new LeadResource($lead->fresh(['owner','assignee']));
    }

    private function assignRoundRobin(?int $teamId): ?int
    {
        if (!$teamId) {
            return null;
        }

        $team = Team::with('salesMembers')->find($teamId);
        if (!$team || $team->salesMembers->isEmpty()) {
            return null;
        }

        $memberIds = $team->salesMembers->pluck('id')->sort()->values();
        $lastAssigned = $team->last_assigned_user_id;
        $nextIndex = 0;

        if ($lastAssigned) {
            $currentIndex = $memberIds->search($lastAssigned);
            if ($currentIndex !== false) {
                $nextIndex = ($currentIndex + 1) % $memberIds->count();
            }
        }

        $nextId = $memberIds[$nextIndex];
        $team->update(['last_assigned_user_id' => $nextId]);

        return $nextId;
    }
}
