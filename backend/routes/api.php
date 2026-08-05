<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AiInsightsController;
use App\Http\Controllers\Api\AiShiftController;
use App\Http\Controllers\Api\ActivityCalendarController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\Co2ControlController;
use App\Http\Controllers\Api\EveningPrepController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\HandoverController;
use App\Http\Controllers\Api\ManualShiftController;
use App\Http\Controllers\Api\MorningRoundController;
use App\Http\Controllers\Api\MorningRoundItemController;
use App\Http\Controllers\Api\ShiftAttachmentController;
use App\Http\Controllers\Api\ShiftHistoryController;
use App\Http\Controllers\Api\TranscriptionController;
use App\Http\Controllers\Api\WaterControlController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

Route::post('/shifts/manual', [ManualShiftController::class, 'store']);
Route::post('/shifts/from-text/preview', [AiShiftController::class, 'preview']);
Route::post('/shifts/from-text', [AiShiftController::class, 'store']);
Route::post('/ai/ask', [AiAssistantController::class, 'ask']);
Route::get('/ai/insights', [AiInsightsController::class, 'index']);
Route::post('/transcribe', [TranscriptionController::class, 'store']);
Route::get('/activity-calendar', [ActivityCalendarController::class, 'index']);
Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
Route::get('/analytics/co2', [AnalyticsController::class, 'co2']);
Route::get('/analytics/failures', [AnalyticsController::class, 'failures']);
Route::get('/analytics/temperatures', [AnalyticsController::class, 'temperatures']);
Route::get('/co2-control', [Co2ControlController::class, 'index']);
Route::get('/equipment', [EquipmentController::class, 'index']);
Route::get('/equipment/{equipment}', [EquipmentController::class, 'show']);
Route::post('/equipment/{equipment}/work-logs', [EquipmentController::class, 'storeWorkLog']);
Route::get('/handover', [HandoverController::class, 'index']);
Route::patch('/handover/{handoverItem}', [HandoverController::class, 'update']);
Route::get('/evening-preps', [EveningPrepController::class, 'show']);
Route::post('/evening-preps', [EveningPrepController::class, 'store']);
Route::get('/morning-rounds', [MorningRoundController::class, 'show']);
Route::post('/morning-rounds', [MorningRoundController::class, 'store']);
Route::post('/morning-round-items', [MorningRoundItemController::class, 'store']);
Route::patch('/morning-round-items/{morningRoundItem}', [MorningRoundItemController::class, 'update']);
Route::delete('/morning-round-items/{morningRoundItem}', [MorningRoundItemController::class, 'destroy']);
Route::get('/water-control', [WaterControlController::class, 'show']);
Route::post('/water-control', [WaterControlController::class, 'store']);
Route::get('/shifts', [ShiftHistoryController::class, 'index']);
Route::get('/shifts/export', [ShiftHistoryController::class, 'export']);
Route::get('/shifts/{shift}', [ShiftHistoryController::class, 'show']);
Route::post('/shifts/{shift}/attachments', [ShiftAttachmentController::class, 'store']);
Route::get('/attachments/{attachment}/download', [ShiftAttachmentController::class, 'download'])->name('attachments.download');
