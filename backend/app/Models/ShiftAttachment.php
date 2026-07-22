<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftAttachment extends Model
{
    use HasFactory;

    public const TYPE_IMAGE = 'image';
    public const TYPE_AUDIO = 'audio';
    public const TYPE_DOCUMENT = 'document';
    public const TYPE_OTHER = 'other';

    protected $fillable = [
        'shift_id',
        'original_name',
        'stored_name',
        'disk_path',
        'mime_type',
        'attachment_type',
        'size_bytes',
        'caption',
    ];

    protected $hidden = [
        'disk_path',
    ];

    protected $appends = [
        'download_url',
        'is_previewable_image',
    ];

    protected function casts(): array
    {
        return [
            'shift_id' => 'integer',
            'size_bytes' => 'integer',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function getDownloadUrlAttribute(): string
    {
        return route('attachments.download', $this);
    }

    public function getIsPreviewableImageAttribute(): bool
    {
        return is_string($this->mime_type) && str_starts_with($this->mime_type, 'image/');
    }
}
