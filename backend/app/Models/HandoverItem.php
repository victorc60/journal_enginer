<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HandoverItem extends Model
{
    use HasFactory;

    public const STATUS_OPEN = 'open';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_RESOLVED = 'resolved';

    public const PRIORITY_LOW = 'low';
    public const PRIORITY_NORMAL = 'normal';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_URGENT = 'urgent';

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_IN_PROGRESS,
        self::STATUS_RESOLVED,
    ];

    public const PRIORITIES = [
        self::PRIORITY_LOW,
        self::PRIORITY_NORMAL,
        self::PRIORITY_HIGH,
        self::PRIORITY_URGENT,
    ];

    protected $fillable = [
        'shift_id',
        'equipment_id',
        'equipment_name',
        'title',
        'details',
        'status',
        'priority',
        'assigned_to',
        'due_date',
        'resolution_notes',
        'resolved_at',
    ];

    protected $appends = [
        'is_overdue',
    ];

    protected function casts(): array
    {
        return [
            'shift_id' => 'integer',
            'equipment_id' => 'integer',
            'due_date' => 'date',
            'resolved_at' => 'datetime',
        ];
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function getIsOverdueAttribute(): bool
    {
        if ($this->status === self::STATUS_RESOLVED || ! $this->due_date instanceof CarbonInterface) {
            return false;
        }

        return $this->due_date->isBefore(now()->startOfDay());
    }
}
