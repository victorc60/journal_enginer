<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_date',
        'heads_count',
        'work_hours',
        'co2_start_kg',
        'co2_end_kg',
        'co2_used_kg',
        'co2_per_head_g',
        'outside_temp_c',
        'chiller_temp_c',
        'meat_temp_c',
        'raw_text',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shift_date' => 'date',
            'heads_count' => 'integer',
            'work_hours' => 'decimal:2',
            'co2_start_kg' => 'decimal:2',
            'co2_end_kg' => 'decimal:2',
            'co2_used_kg' => 'decimal:2',
            'co2_per_head_g' => 'decimal:2',
            'outside_temp_c' => 'decimal:2',
            'chiller_temp_c' => 'decimal:2',
            'meat_temp_c' => 'decimal:2',
        ];
    }

    public function failures(): HasMany
    {
        return $this->hasMany(Failure::class);
    }

    public function maintenanceEvents(): HasMany
    {
        return $this->hasMany(MaintenanceEvent::class);
    }

    public function shiftNotes(): HasMany
    {
        return $this->hasMany(ShiftNote::class);
    }
}
