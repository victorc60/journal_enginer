<?php

namespace Tests\Feature;

use App\Models\Shift;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class Co2ControlApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('shifts');

        Schema::create('shifts', function (Blueprint $table): void {
            $table->id();
            $table->date('shift_date');
            $table->integer('heads_count')->nullable();
            $table->decimal('work_hours', 5, 2)->nullable();
            $table->decimal('co2_start_kg', 10, 2)->nullable();
            $table->decimal('co2_end_kg', 10, 2)->nullable();
            $table->decimal('co2_used_kg', 10, 2)->nullable();
            $table->decimal('co2_per_head_g', 10, 2)->nullable();
            $table->decimal('outside_temp_c', 5, 2)->nullable();
            $table->decimal('chiller_temp_c', 5, 2)->nullable();
            $table->decimal('meat_temp_c', 5, 2)->nullable();
            $table->longText('raw_text');
            $table->longText('notes')->nullable();
            $table->timestamps();
        });

        Shift::query()->create([
            'shift_date' => '2026-07-28',
            'heads_count' => 600,
            'co2_start_kg' => 24000,
            'co2_end_kg' => 23830,
            'co2_used_kg' => 170,
            'co2_per_head_g' => 283.33,
            'raw_text' => '',
        ]);

        Shift::query()->create([
            'shift_date' => '2026-07-27',
            'heads_count' => 500,
            'co2_start_kg' => 24200,
            'co2_end_kg' => 24020,
            'co2_used_kg' => 180,
            'co2_per_head_g' => 360,
            'raw_text' => '',
        ]);
    }

    public function test_it_returns_co2_control_rows_and_summary(): void
    {
        $response = $this->getJson('/api/co2-control?from=2026-07-27&to=2026-07-28');

        $response
            ->assertOk()
            ->assertJsonPath('summary.tracked_shifts_count', 2)
            ->assertJsonPath('summary.total_heads_count', 1100)
            ->assertJsonPath('summary.total_co2_used_kg', 350)
            ->assertJsonPath('summary.latest_remaining_kg', 23830)
            ->assertJsonPath('summary.latest_remaining_tons', 23.83)
            ->assertJsonPath('rows.0.shift_date', '2026-07-28')
            ->assertJsonPath('rows.0.co2_end_kg', 23830)
            ->assertJsonPath('rows.0.remaining_tons', 23.83);
    }
}
