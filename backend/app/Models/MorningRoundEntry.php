<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MorningRoundEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'morning_round_id',
        'morning_round_item_id',
        'item_section',
        'item_title',
        'item_details',
        'is_checked',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'morning_round_id' => 'integer',
            'morning_round_item_id' => 'integer',
            'is_checked' => 'boolean',
        ];
    }

    public function morningRound(): BelongsTo
    {
        return $this->belongsTo(MorningRound::class);
    }

    public function morningRoundItem(): BelongsTo
    {
        return $this->belongsTo(MorningRoundItem::class);
    }
}
