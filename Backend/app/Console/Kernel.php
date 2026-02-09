<?php

namespace App\Console;

use App\Console\Commands\CheckTaskDueCommand;
use App\Console\Commands\CheckNoFollowUp;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command(CheckTaskDueCommand::class)->everyFiveMinutes();
        
        // kiểm tra follow up và task quá hạn lúc 8h
        $schedule->command(CheckNoFollowUp::class)->dailyAt('08:00');
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
