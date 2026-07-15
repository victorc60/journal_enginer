<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftNote extends Model
{
    use HasFactory;

    public const CATEGORY_PRODUCTION = 'production';
    public const CATEGORY_CO2 = 'co2';
    public const CATEGORY_TEMPERATURES = 'temperatures';
    public const CATEGORY_FAILURES = 'failures';
    public const CATEGORY_MAINTENANCE = 'maintenance';
    public const CATEGORY_IDEAS = 'ideas';
    public const CATEGORY_GENERAL_NOTES = 'general_notes';

    public const CATEGORIES = [
        self::CATEGORY_PRODUCTION,
        self::CATEGORY_CO2,
        self::CATEGORY_TEMPERATURES,
        self::CATEGORY_FAILURES,
        self::CATEGORY_MAINTENANCE,
        self::CATEGORY_IDEAS,
        self::CATEGORY_GENERAL_NOTES,
    ];

    protected $fillable = [
        'shift_id',
        'category',
        'content',
    ];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }
}
