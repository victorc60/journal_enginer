<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WaterControlLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'log_date',
        'artesian_supply_start',
        'artesian_supply_end',
        'artesian_supply_used',
        'pump_power_start',
        'pump_power_end',
        'pump_power_used',
        'purified_water_start',
        'purified_water_end',
        'purified_water_used',
        'raw_water_direct_start',
        'raw_water_direct_end',
        'raw_water_direct_used',
        'sodium_hypochlorite_liters',
        'antiscalant_grams',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date',
            'artesian_supply_start' => 'decimal:2',
            'artesian_supply_end' => 'decimal:2',
            'artesian_supply_used' => 'decimal:2',
            'pump_power_start' => 'decimal:2',
            'pump_power_end' => 'decimal:2',
            'pump_power_used' => 'decimal:2',
            'purified_water_start' => 'decimal:2',
            'purified_water_end' => 'decimal:2',
            'purified_water_used' => 'decimal:2',
            'raw_water_direct_start' => 'decimal:2',
            'raw_water_direct_end' => 'decimal:2',
            'raw_water_direct_used' => 'decimal:2',
            'sodium_hypochlorite_liters' => 'decimal:2',
            'antiscalant_grams' => 'decimal:2',
        ];
    }
}
