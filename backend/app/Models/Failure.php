<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Failure extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_id',
        'equipment_id',
        'equipment_name',
        'problem',
        'cause',
        'solution',
        'downtime_minutes',
        'severity',
        'status',
        'assigned_to',
        'parts_needed',
        'next_action',
        'due_date',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'shift_id' => 'integer',
            'equipment_id' => 'integer',
            'downtime_minutes' => 'integer',
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
}
