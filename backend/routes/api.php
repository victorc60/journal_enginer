<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AiInsightsController;
use App\Http\Controllers\Api\AiShiftController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\HandoverController;
use App\Http\Controllers\Api\ManualShiftController;
use App\Http\Controllers\Api\ShiftAttachmentController;
use App\Http\Controllers\Api\ShiftHistoryController;
use App\Http\Controllers\Api\TranscriptionController;
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
Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
Route::get('/analytics/co2', [AnalyticsController::class, 'co2']);
Route::get('/analytics/failures', [AnalyticsController::class, 'failures']);
Route::get('/analytics/temperatures', [AnalyticsController::class, 'temperatures']);
Route::get('/equipment', [EquipmentController::class, 'index']);
Route::get('/equipment/{equipment}', [EquipmentController::class, 'show']);
Route::get('/handover', [HandoverController::class, 'index']);
Route::patch('/handover/{handoverItem}', [HandoverController::class, 'update']);
Route::get('/shifts', [ShiftHistoryController::class, 'index']);
Route::get('/shifts/export', [ShiftHistoryController::class, 'export']);
Route::get('/shifts/{shift}', [ShiftHistoryController::class, 'show']);
Route::post('/shifts/{shift}/attachments', [ShiftAttachmentController::class, 'store']);
Route::get('/attachments/{attachment}/download', [ShiftAttachmentController::class, 'download'])->name('attachments.download');
