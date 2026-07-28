<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('water_control_logs', function (Blueprint $table): void {
            $table->id();
            $table->date('log_date')->unique();
            $table->decimal('artesian_supply_start', 12, 2)->nullable();
            $table->decimal('artesian_supply_end', 12, 2)->nullable();
            $table->decimal('artesian_supply_used', 12, 2)->nullable();
            $table->decimal('pump_power_start', 12, 2)->nullable();
            $table->decimal('pump_power_end', 12, 2)->nullable();
            $table->decimal('pump_power_used', 12, 2)->nullable();
            $table->decimal('purified_water_start', 12, 2)->nullable();
            $table->decimal('purified_water_end', 12, 2)->nullable();
            $table->decimal('purified_water_used', 12, 2)->nullable();
            $table->decimal('raw_water_direct_start', 12, 2)->nullable();
            $table->decimal('raw_water_direct_end', 12, 2)->nullable();
            $table->decimal('raw_water_direct_used', 12, 2)->nullable();
            $table->decimal('sodium_hypochlorite_liters', 10, 2)->nullable();
            $table->decimal('antiscalant_grams', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('water_control_logs');
    }
};
