<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EveningPrep extends Model
{
    use HasFactory;

    protected $fillable = [
        'prep_date',
        'target_date',
        'is_next_day_slaughter',
    ];

    protected function casts(): array
    {
        return [
            'prep_date' => 'date',
            'target_date' => 'date',
            'is_next_day_slaughter' => 'boolean',
        ];
    }

    public function entries(): HasMany
    {
        return $this->hasMany(EveningPrepEntry::class);
    }
}
