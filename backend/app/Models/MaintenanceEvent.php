<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_id',
        'equipment_id',
        'equipment_name',
        'action',
        'parts_used',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shift_id' => 'integer',
            'equipment_id' => 'integer',
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
