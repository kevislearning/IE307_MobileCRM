<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\TestConsoleController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/test-console', [TestConsoleController::class, 'index'])->name('test.console');
