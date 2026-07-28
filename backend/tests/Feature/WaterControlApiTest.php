<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WaterControlApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('water_control_logs');

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

    public function test_it_returns_empty_water_log_payload_for_requested_date(): void
    {
        $response = $this->getJson('/api/water-control?date=2026-07-28');

        $response
            ->assertOk()
            ->assertJsonPath('date', '2026-07-28')
            ->assertJsonPath('log', null)
            ->assertJsonCount(0, 'history');
    }

    public function test_it_saves_water_control_log_and_calculates_usage(): void
    {
        $response = $this->postJson('/api/water-control', [
            'log_date' => '2026-07-28',
            'artesian_supply_start' => 100,
            'artesian_supply_end' => 138.5,
            'pump_power_start' => 50,
            'pump_power_end' => 60.25,
            'purified_water_start' => 20,
            'purified_water_end' => 29,
            'raw_water_direct_start' => 10,
            'raw_water_direct_end' => 14.2,
            'sodium_hypochlorite_liters' => 70,
            'antiscalant_grams' => 10,
            'notes' => 'Контроль по воде завершен.',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('log.artesian_supply_used', '38.50')
            ->assertJsonPath('log.pump_power_used', '10.25')
            ->assertJsonPath('log.purified_water_used', '9.00')
            ->assertJsonPath('log.raw_water_direct_used', '4.20')
            ->assertJsonPath('log.sodium_hypochlorite_liters', '70.00')
            ->assertJsonPath('log.antiscalant_grams', '10.00');

        $this->assertDatabaseHas('water_control_logs', [
            'notes' => 'Контроль по воде завершен.',
        ]);

        $this->assertSame(
            '2026-07-28',
            DB::table('water_control_logs')->value('log_date')
                ? substr((string) DB::table('water_control_logs')->value('log_date'), 0, 10)
                : null
        );
    }
}
