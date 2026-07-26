<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipment extends Model
{
    use HasFactory;

    protected $table = 'equipment';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'category',
        'configuration',
        'notes',
        'service_points',
        'common_issues',
    ];

    protected function casts(): array
    {
        return [
            'service_points' => 'array',
            'common_issues' => 'array',
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

    public function handoverItems(): HasMany
    {
        return $this->hasMany(HandoverItem::class);
    }
}
