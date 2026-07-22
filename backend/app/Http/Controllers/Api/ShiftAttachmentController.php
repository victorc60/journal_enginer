<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShiftAttachmentRequest;
use App\Models\Shift;
use App\Models\ShiftAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ShiftAttachmentController extends Controller
{
    public function store(StoreShiftAttachmentRequest $request, Shift $shift): JsonResponse
    {
        $created = [];
        $caption = $request->validated()['caption'] ?? null;

        foreach ($request->file('files', []) as $file) {
            $storedName = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
            $diskPath = $file->storeAs("shift-attachments/{$shift->id}", $storedName, 'local');

            $created[] = $shift->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'disk_path' => $diskPath,
                'mime_type' => $file->getMimeType(),
                'attachment_type' => $this->detectAttachmentType($file->getMimeType()),
                'size_bytes' => $file->getSize(),
                'caption' => $caption,
            ]);
        }

        return response()->json($created, 201);
    }

    public function download(ShiftAttachment $attachment)
    {
        abort_unless(Storage::disk('local')->exists($attachment->disk_path), 404);

        return Storage::disk('local')->download($attachment->disk_path, $attachment->original_name);
    }

    private function detectAttachmentType(?string $mimeType): string
    {
        if ($mimeType === null) {
            return ShiftAttachment::TYPE_OTHER;
        }

        if (str_starts_with($mimeType, 'image/')) {
            return ShiftAttachment::TYPE_IMAGE;
        }

        if (str_starts_with($mimeType, 'audio/')) {
            return ShiftAttachment::TYPE_AUDIO;
        }

        if (
            str_starts_with($mimeType, 'application/')
            || str_starts_with($mimeType, 'text/')
            || str_contains($mimeType, 'spreadsheet')
        ) {
            return ShiftAttachment::TYPE_DOCUMENT;
        }

        return ShiftAttachment::TYPE_OTHER;
    }
}
