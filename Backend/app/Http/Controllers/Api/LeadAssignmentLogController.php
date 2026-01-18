<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadAssignmentLog;
use Illuminate\Support\Facades\Auth;

class LeadAssignmentLogController extends Controller
{
    public function index(Lead $lead)
    {
        $this->authorize('view', $lead);
        return LeadAssignmentLog::where('lead_id', $lead->id)
            ->orderByDesc('created_at')
            ->get();
    }
}
