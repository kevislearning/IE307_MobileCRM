<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OpportunityController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LeadAssignmentLogController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\TaskSubtaskController;
use App\Http\Controllers\Api\TaskTemplateController;
use App\Http\Controllers\Api\OpportunityLineItemController;
use App\Http\Controllers\Api\LeadFilterController;
use App\Http\Controllers\Api\TaskTagController;

Route::post('/login',[AuthController::class,'login'])->middleware('throttle:5,1')->name('auth.login');
Route::post('/register',[AuthController::class,'register'])->middleware('throttle:5,1')->name('auth.register');
Route::post('/refresh',[AuthController::class,'refresh'])->name('auth.refresh');
Route::post('/forgot',[AuthController::class,'forgot'])->middleware('throttle:3,1');
Route::post('/reset',[AuthController::class,'reset'])->middleware('throttle:3,1');

Route::middleware('jwt')->group(function () {
    Route::get('/me',[AuthController::class,'me']);
    Route::put('/me',[AuthController::class,'updateProfile']);
    Route::post('/logout',[AuthController::class,'logout']);
    Route::post('/password/change',[AuthController::class,'changePassword']);
    Route::post('/devices',[DeviceController::class,'store']);
    Route::delete('/devices',[DeviceController::class,'destroy']);

    Route::apiResource('leads',LeadController::class)->only(['index','store','show','update','destroy']);
    Route::get('/leads/duplicates', [LeadController::class, 'duplicates']);
    Route::post('/leads/{lead}/assign', [LeadController::class, 'assign']);
    Route::get('/leads/{lead}/activities', [LeadController::class, 'activities']);
    Route::get('/leads/{lead}/care-history', [LeadController::class, 'careHistory']);
    Route::get('/leads/{lead}/timeline', [LeadController::class, 'timeline']);
    Route::get('/leads/{lead}/assignments', [LeadAssignmentLogController::class, 'index']);
    Route::apiResource('lead-filters', LeadFilterController::class)->only(['index','store','update','destroy']);
    Route::post('/activities',[ActivityController::class,'store']);
    Route::post('/leads/{lead}/merge', [LeadController::class, 'merge']);
    
    // Note routes
    Route::get('/leads/{lead}/notes', [NoteController::class, 'index']);
    Route::post('/notes', [NoteController::class, 'store']);
    Route::delete('/notes/{note}', [NoteController::class, 'destroy']);
    
    Route::apiResource('tasks',TaskController::class)->only(['index','store','show','update','destroy']);
    Route::get('/tasks/{task}/subtasks', [TaskSubtaskController::class, 'index']);
    Route::post('/tasks/{task}/subtasks', [TaskSubtaskController::class, 'store']);
    Route::put('/subtasks/{subtask}', [TaskSubtaskController::class, 'update']);
    Route::delete('/subtasks/{subtask}', [TaskSubtaskController::class, 'destroy']);
    Route::apiResource('task-templates', TaskTemplateController::class)->only(['index','store','update','destroy']);
    Route::apiResource('task-tags', TaskTagController::class)->only(['index','store','update','destroy']);
    Route::put('/tasks/{task}/tags', [TaskTagController::class, 'sync']);
    Route::apiResource('opportunities',OpportunityController::class)->only(['index','store','show','update','destroy']);
    Route::get('/opportunities/pipeline', [OpportunityController::class, 'pipeline']);
    Route::get('/opportunities/forecast', [OpportunityController::class, 'forecast']);
    Route::get('/opportunities/{opportunity}/line-items', [OpportunityLineItemController::class, 'index']);
    Route::post('/opportunities/{opportunity}/line-items', [OpportunityLineItemController::class, 'store']);
    Route::put('/opportunity-line-items/{opportunityLineItem}', [OpportunityLineItemController::class, 'update']);
    Route::delete('/opportunity-line-items/{opportunityLineItem}', [OpportunityLineItemController::class, 'destroy']);
    Route::get('/notifications',[NotificationController::class,'index']);
    Route::get('/notifications/{notification}',[NotificationController::class,'show']);
    Route::put('/notifications/{notification}/read',[NotificationController::class,'markAsRead']);
    Route::put('/notifications/{notification}/unread',[NotificationController::class,'markAsUnread']);
    Route::put('/notifications/read-all',[NotificationController::class,'markAllAsRead']);
    Route::delete('/notifications/{notification}',[NotificationController::class,'destroy']);
    Route::get('/notifications-badge',[NotificationController::class,'badge']);
    Route::get('/notifications/task-due-soon',[NotificationController::class,'taskDueSoon']);
    Route::post('/notifications/task-reminders',[NotificationController::class,'taskReminders']);
    Route::post('/notifications/follow-up-due',[NotificationController::class,'followUpDue']);
    Route::post('/attachments',[AttachmentController::class,'store']);
    Route::get('/attachments/{attachment}/preview',[AttachmentController::class,'preview']);
    Route::get('/attachments/{attachment}/signed',[AttachmentController::class,'signedPreview'])->withoutMiddleware('jwt');
    Route::post('/attachments/{attachment}/sign',[AttachmentController::class,'sign']);
    Route::delete('/attachments/{attachment}',[AttachmentController::class,'destroy']);

    Route::apiResource('users', UserController::class)->only(['index','store','update','destroy']);
    Route::get('/team-members', [UserController::class, 'teamMembers']);
    Route::get('/dashboard', DashboardController::class);
});
