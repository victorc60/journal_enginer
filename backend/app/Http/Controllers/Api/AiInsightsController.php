<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiInsightsService;
use Illuminate\Http\JsonResponse;

class AiInsightsController extends Controller
{
    public function index(AiInsightsService $insights): JsonResponse
    {
        return response()->json($insights->generate());
    }
}
