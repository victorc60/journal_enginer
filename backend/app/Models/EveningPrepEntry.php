<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EveningPrepEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'evening_prep_id',
        'evening_prep_item_id',
        'item_section',
        'item_title',
        'item_details',
        'is_checked',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'evening_prep_id' => 'integer',
            'evening_prep_item_id' => 'integer',
            'is_checked' => 'boolean',
        ];
    }

    public function eveningPrep(): BelongsTo
    {
        return $this->belongsTo(EveningPrep::class);
    }

    public function eveningPrepItem(): BelongsTo
    {
        return $this->belongsTo(EveningPrepItem::class);
    }
}
