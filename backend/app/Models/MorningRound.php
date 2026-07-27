<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MorningRound extends Model
{
    use HasFactory;

    protected $fillable = [
        'round_date',
        'is_slaughter_day',
    ];

    protected function casts(): array
    {
        return [
            'round_date' => 'date',
            'is_slaughter_day' => 'boolean',
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(MorningRoundEntry::class);
    }
}
