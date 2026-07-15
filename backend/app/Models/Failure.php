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
    ];

    protected function casts(): array
    {
        return [
            'shift_id' => 'integer',
            'equipment_id' => 'integer',
            'downtime_minutes' => 'integer',
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
