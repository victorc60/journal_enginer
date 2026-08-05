<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentWorkLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_id',
        'performed_on',
        'action',
        'parts_used',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'equipment_id' => 'integer',
            'performed_on' => 'date',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }
}
