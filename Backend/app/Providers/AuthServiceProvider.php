<?php

namespace App\Providers;

use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Task;
use App\Policies\LeadPolicy;
use App\Policies\OpportunityPolicy;
use App\Policies\TaskPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Lead::class => LeadPolicy::class,
        Opportunity::class => OpportunityPolicy::class,
        Task::class => TaskPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
