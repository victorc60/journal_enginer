<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ActivityCalendarApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('morning_round_entries');
        Schema::dropIfExists('morning_rounds');
        Schema::dropIfExists('evening_prep_entries');
        Schema::dropIfExists('evening_preps');
        Schema::dropIfExists('water_control_logs');
        Schema::dropIfExists('shifts');

        Schema::create('morning_rounds', function (Blueprint $table): void {
            $table->id();
            $table->date('round_date')->unique();
            $table->boolean('is_slaughter_day')->default(true);
            $table->timestamps();
        });

        Schema::create('morning_round_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('morning_round_id')->constrained()->cascadeOnDelete();
            $table->foreignId('morning_round_item_id')->nullable();
            $table->string('item_section');
            $table->string('item_title');
            $table->text('item_details')->nullable();
            $table->boolean('is_checked')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('evening_preps', function (Blueprint $table): void {
            $table->id();
            $table->date('prep_date')->unique();
            $table->date('target_date');
            $table->boolean('is_next_day_slaughter')->default(true);
            $table->timestamps();
        });

        Schema::create('evening_prep_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('evening_prep_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evening_prep_item_id')->nullable();
            $table->string('item_section');
            $table->string('item_title');
            $table->text('item_details')->nullable();
            $table->boolean('is_checked')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
        });

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
            $table->decimal('sodium_hypochlorite_liters', 12, 2)->nullable();
            $table->decimal('antiscalant_grams', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

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
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_it_returns_calendar_activity_for_the_requested_month(): void
    {
        Carbon::setTestNow('2026-08-05 08:00:00');
        CarbonImmutable::setTestNow('2026-08-05 08:00:00');

        $morningRoundId = \DB::table('morning_rounds')->insertGetId([
            'round_date' => '2026-08-03',
            'is_slaughter_day' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('morning_round_entries')->insert([
            [
                'morning_round_id' => $morningRoundId,
                'morning_round_item_id' => 1,
                'item_section' => 'Осмотр',
                'item_title' => 'Проверка узла 1',
                'is_checked' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'morning_round_id' => $morningRoundId,
                'morning_round_item_id' => 2,
                'item_section' => 'Осмотр',
                'item_title' => 'Проверка узла 2',
                'is_checked' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'morning_round_id' => $morningRoundId,
                'morning_round_item_id' => 3,
                'item_section' => 'Осмотр',
                'item_title' => 'Проверка узла 3',
                'is_checked' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $eveningPrepId = \DB::table('evening_preps')->insertGetId([
            'prep_date' => '2026-08-03',
            'target_date' => '2026-08-04',
            'is_next_day_slaughter' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('evening_prep_entries')->insert([
            [
                'evening_prep_id' => $eveningPrepId,
                'evening_prep_item_id' => 1,
                'item_section' => 'Подготовка',
                'item_title' => 'Проверка 1',
                'is_checked' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'evening_prep_id' => $eveningPrepId,
                'evening_prep_item_id' => 2,
                'item_section' => 'Подготовка',
                'item_title' => 'Проверка 2',
                'is_checked' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        \DB::table('water_control_logs')->insert([
            'log_date' => '2026-08-03',
            'artesian_supply_start' => 100,
            'artesian_supply_end' => 120,
            'artesian_supply_used' => 20,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \DB::table('shifts')->insert([
            'shift_date' => '2026-08-03',
            'heads_count' => 550,
            'co2_start_kg' => 24000,
            'co2_end_kg' => 23830,
            'co2_used_kg' => 170,
            'co2_per_head_g' => 309.09,
            'raw_text' => 'test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->getJson('/api/activity-calendar?month=2026-08');

        $response
            ->assertOk()
            ->assertJsonPath('month', '2026-08')
            ->assertJsonPath('today', '2026-08-05')
            ->assertJsonPath('summary.active_days_count', 1)
            ->assertJsonPath('summary.complete_days_count', 1)
            ->assertJsonPath('summary.morning_round_days_count', 1)
            ->assertJsonPath('summary.evening_prep_days_count', 1)
            ->assertJsonPath('summary.water_log_days_count', 1)
            ->assertJsonPath('summary.shift_days_count', 1)
            ->assertJsonPath('summary.co2_days_count', 1)
            ->assertJsonFragment([
                'date' => '2026-08-03',
                'recorded_items_count' => 5,
                'expected_items_count' => 5,
                'completed_expected_count' => 5,
                'is_complete' => true,
            ])
            ->assertJsonFragment([
                'key' => 'morning_round',
                'label' => 'Утренний обход',
                'recorded' => true,
                'expected' => true,
                'value' => '2 пунктов отмечено',
                'href' => '/morning-rounds',
            ])
            ->assertJsonFragment([
                'key' => 'co2',
                'label' => 'CO2',
                'recorded' => true,
                'expected' => true,
                'value' => '170.00 кг расхода',
                'href' => '/water-co2',
            ]);
    }
}
