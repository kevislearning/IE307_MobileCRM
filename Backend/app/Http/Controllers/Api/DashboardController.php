<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\Notification;
use App\Models\Opportunity;
use App\Models\Task;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke()
    {
        /** @var User $user */
        $user = Auth::user();

        // Cache dashboard data for 5 minutes
        $cacheKey = "dashboard_metrics_{$user->id}";
        
        return Cache::remember($cacheKey, 300, function () use ($user) {
            return $this->buildDashboardData($user);
        });
    }

    private function buildDashboardData(User $user)
    {
        $leadQuery = Lead::query();
        $taskQuery = Task::query();
        $oppQuery = Opportunity::query();
        $notificationQuery = Notification::where('user_id', $user->id);

        if ($user->isAdmin()) {
            // no restrictions
        } elseif ($user->isOwner()) {
            $teamIds = $user->teamMembers()->pluck('id')->toArray();
            $leadQuery->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('owner_id', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
            $taskQuery->where(function($q) use ($user, $teamIds) {
                $q->where('assigned_to', $user->id)
                  ->orWhereIn('assigned_to', $teamIds);
            });
            $oppQuery->where(function($q) use ($user, $teamIds) {
                $q->where('owner_id', $user->id)
                  ->orWhereIn('owner_id', $teamIds);
            });
        } else {
            $leadQuery->where(function($q) use ($user) {
                $q->where('assigned_to', $user->id)->orWhere('owner_id', $user->id);
            });
            $taskQuery->where('assigned_to', $user->id);
            $oppQuery->where('owner_id', $user->id);
        }

        $today = now()->toDateString();

        // === SECTION 1: OVERVIEW ===
        // Total pipeline value (exclude lost)
        $totalPipelineValue = (clone $oppQuery)
            ->whereNotIn('stage', ['LOST'])
            ->sum('estimated_value');

        // Forecast revenue (sum of expected_revenue)
        $forecastRevenue = (clone $oppQuery)
            ->whereNotIn('stage', ['LOST'])
            ->sum('expected_revenue');

        // Forecast this month
        $forecastThisMonth = (clone $oppQuery)
            ->whereNotIn('stage', ['LOST'])
            ->whereMonth('expected_close_date', now()->month)
            ->whereYear('expected_close_date', now()->year)
            ->sum('expected_revenue');

        // === SECTION 2: PIPELINE BY STAGE ===
        $pipelineByStage = (clone $oppQuery)
            ->whereNotIn('stage', ['LOST'])
            ->select('stage')
            ->selectRaw('COUNT(*) as total_deals')
            ->selectRaw('SUM(estimated_value) as total_value')
            ->selectRaw('SUM(expected_revenue) as expected_revenue')
            ->groupBy('stage')
            ->get()
            ->map(function ($item) {
                return [
                    'stage' => $item->stage,
                    'total_deals' => (int) $item->total_deals,
                    'total_value' => (float) $item->total_value,
                    'expected_revenue' => (float) $item->expected_revenue,
                ];
            });

        // === SECTION 3: BOTTLENECK DETECTION ===
        $bottleneck = (clone $oppQuery)
            ->whereNotIn('stage', ['WON', 'LOST'])
            ->whereNotNull('stage_updated_at')
            ->select('stage')
            ->selectRaw('AVG(DATEDIFF(NOW(), stage_updated_at)) as avg_days')
            ->selectRaw('COUNT(*) as total_deals')
            ->groupBy('stage')
            ->orderByDesc('avg_days')
            ->first();

        $bottleneckData = $bottleneck ? [
            'stage' => $bottleneck->stage,
            'avg_days' => round((float) $bottleneck->avg_days, 1),
            'total_deals' => (int) $bottleneck->total_deals,
        ] : null;

        // === SECTION 4: SALES PERFORMANCE ===
        $salesPerformance = User::where('role', 'staff')
            ->get()
            ->map(function ($sales) use ($oppQuery) {
                $salesOppQuery = (clone $oppQuery)->where('owner_id', $sales->id);
                
                $wonDeals = (clone $salesOppQuery)->where('stage', 'WON')->count();
                $totalDeals = (clone $salesOppQuery)->count();
                $revenue = (clone $salesOppQuery)->where('stage', 'WON')->sum('estimated_value');
                $winRate = $totalDeals > 0 ? round(($wonDeals / $totalDeals) * 100, 1) : 0;
                
                // Average deal time (for won deals with closed_at)
                $avgDealTime = (clone $salesOppQuery)
                    ->where('stage', 'WON')
                    ->whereNotNull('stage_updated_at')
                    ->selectRaw('AVG(DATEDIFF(stage_updated_at, created_at)) as avg_days')
                    ->value('avg_days');

                return [
                    'sales_id' => $sales->id,
                    'sales_name' => $sales->name,
                    'won_deals' => $wonDeals,
                    'total_deals' => $totalDeals,
                    'revenue' => (float) $revenue,
                    'win_rate' => $winRate,
                    'avg_deal_time' => $avgDealTime ? round((float) $avgDealTime, 1) : null,
                ];
            })
            ->filter(fn($item) => $item['total_deals'] > 0)
            ->sortByDesc('revenue')
            ->values();

        // === ADDITIONAL METRICS (kept for compatibility) ===
        $staleDate = now()->subDays(7);

        // Team member count for manager
        $teamMemberCount = 0;
        if ($user->isOwner()) {
            $teamMemberCount = User::where('manager_id', $user->id)->count();
        }

        // Open deals count
        $openDealsCount = (clone $oppQuery)
            ->whereNotIn('stage', ['WON', 'LOST'])
            ->count();

        // Leads no follow-up (more than 7 days)
        $leadsNoFollowUp = (clone $leadQuery)
            ->whereNotIn('status', [Lead::STATUS_WON, Lead::STATUS_LOST])
            ->where(function($q) use ($staleDate) {
                $q->whereNull('last_activity_at')
                  ->orWhere('last_activity_at', '<', $staleDate);
            })
            ->count();

        // Conversion rate (WON / (WON + LOST))
        $wonCount = (clone $leadQuery)->where('status', Lead::STATUS_WON)->count();
        $lostCount = (clone $leadQuery)->where('status', Lead::STATUS_LOST)->count();
        $conversionRate = ($wonCount + $lostCount) > 0 
            ? round(($wonCount / ($wonCount + $lostCount)) * 100, 1) 
            : 0;

        return response()->json([
            // Overview
            'total_pipeline_value' => (float) $totalPipelineValue,
            'forecast_revenue' => (float) $forecastRevenue,
            'forecast_this_month' => (float) $forecastThisMonth,
            
            // Pipeline by stage
            'pipeline_by_stage' => $pipelineByStage,
            
            // Bottleneck
            'bottleneck' => $bottleneckData,
            
            // Sales performance
            'sales_performance' => $salesPerformance,
            
            // Manager stats
            'team_member_count' => $teamMemberCount,
            'open_deals' => $openDealsCount,
            'leads_no_followup' => $leadsNoFollowUp,
            'expected_revenue' => (float) $forecastRevenue,
            'conversion_rate' => $conversionRate,
            
            // Legacy metrics (for backward compatibility)
            'total_leads' => (clone $leadQuery)->count(),
            'leads_total' => (clone $leadQuery)->count(),
            'leads_uncontacted' => (clone $leadQuery)->whereNull('last_activity_at')->count(),
            'leads_stale_7d' => (clone $leadQuery)->where(function($q) use ($staleDate) {
                $q->whereNull('last_activity_at')->orWhere('last_activity_at', '<', $staleDate);
            })->count(),
            'tasks_today' => (clone $taskQuery)->whereDate('due_date', $today)->count(),
            'overdue_tasks' => (clone $taskQuery)->whereDate('due_date', '<', $today)->where('status', '!=', Task::STATUS_DONE)->count(),
            'tasks_overdue' => (clone $taskQuery)->whereDate('due_date', '<', $today)->where('status', '!=', Task::STATUS_DONE)->count(),
            'notifications_unread' => $notificationQuery->where('is_read', false)->count(),
            // Follow-up today based on tasks due today
            'followup_today' => (clone $taskQuery)
                ->whereDate('due_date', $today)
                ->where('status', '!=', Task::STATUS_DONE)
                ->count(),
        ]);
    }
}
