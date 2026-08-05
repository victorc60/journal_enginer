<?php

namespace Tests\Feature;

use App\Models\Failure;
use App\Models\Shift;
use App\Models\ShiftAttachment;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AnalyticsWorkWeekApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('shift_attachments');
        Schema::dropIfExists('handover_items');
        Schema::dropIfExists('failures');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('equipment');

        Schema::create('equipment', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('configuration')->nullable();
            $table->text('notes')->nullable();
            $table->json('service_points')->nullable();
            $table->json('common_issues')->nullable();
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

        Schema::create('failures', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->nullable();
            $table->foreignId('equipment_id')->nullable();
            $table->string('equipment_name')->nullable();
            $table->text('problem');
            $table->text('cause')->nullable();
            $table->text('solution')->nullable();
            $table->integer('downtime_minutes')->nullable();
            $table->string('severity')->nullable();
            $table->string('status')->nullable();
            $table->string('assigned_to')->nullable();
            $table->text('parts_needed')->nullable();
            $table->text('next_action')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('handover_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->nullable();
            $table->foreignId('equipment_id')->nullable();
            $table->string('equipment_name')->nullable();
            $table->string('title');
            $table->text('details')->nullable();
            $table->string('status')->default('open');
            $table->string('priority')->default('normal');
            $table->string('assigned_to')->nullable();
            $table->date('due_date')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('shift_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->nullable();
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('disk_path');
            $table->string('mime_type')->nullable();
            $table->string('attachment_type');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->text('caption')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_it_defaults_analytics_to_current_work_week_from_sunday_through_thursday(): void
    {
        Carbon::setTestNow('2026-08-07 09:00:00');
        CarbonImmutable::setTestNow('2026-08-07 09:00:00');

        \DB::table('equipment')->insert([
            ['name' => 'Узел 1'],
            ['name' => 'Узел 2'],
        ]);

        $sundayShift = Shift::query()->create([
            'shift_date' => '2026-08-02',
            'heads_count' => 520,
            'co2_used_kg' => 165,
            'co2_per_head_g' => 317.31,
            'meat_temp_c' => 6.4,
            'raw_text' => '',
        ]);

        $thursdayShift = Shift::query()->create([
            'shift_date' => '2026-08-06',
            'heads_count' => 540,
            'co2_used_kg' => 168,
            'co2_per_head_g' => 311.11,
            'meat_temp_c' => 6.1,
            'raw_text' => '',
        ]);

        $fridayShift = Shift::query()->create([
            'shift_date' => '2026-08-07',
            'heads_count' => 600,
            'co2_used_kg' => 190,
            'co2_per_head_g' => 316.67,
            'meat_temp_c' => 6.8,
            'raw_text' => '',
        ]);

        Failure::query()->create([
            'shift_id' => $sundayShift->id,
            'equipment_name' => 'Вертикальный конвейер',
            'problem' => 'Застревание цепи',
        ]);

        Failure::query()->create([
            'shift_id' => $fridayShift->id,
            'equipment_name' => 'Опалочная печь',
            'problem' => 'Сбой розжига',
        ]);

        ShiftAttachment::query()->create([
            'shift_id' => $sundayShift->id,
            'original_name' => 'photo-1.jpg',
            'stored_name' => 'photo-1.jpg',
            'disk_path' => 'attachments/photo-1.jpg',
            'attachment_type' => 'image',
            'size_bytes' => 2048,
        ]);

        ShiftAttachment::query()->create([
            'shift_id' => $fridayShift->id,
            'original_name' => 'photo-2.jpg',
            'stored_name' => 'photo-2.jpg',
            'disk_path' => 'attachments/photo-2.jpg',
            'attachment_type' => 'image',
            'size_bytes' => 2048,
        ]);

        $summaryResponse = $this->getJson('/api/analytics/summary');

        $summaryResponse
            ->assertOk()
            ->assertJsonPath('range.from', '2026-08-02')
            ->assertJsonPath('range.to', '2026-08-06')
            ->assertJsonPath('range.scope', 'work_week')
            ->assertJsonPath('total_shifts', 2)
            ->assertJsonPath('total_failures', 1)
            ->assertJsonPath('attachments_count', 1)
            ->assertJsonPath('tracked_equipment', 2);

        $co2Response = $this->getJson('/api/analytics/co2');

        $co2Response
            ->assertOk()
            ->assertJsonCount(2, 'co2_usage_by_date')
            ->assertJsonCount(2, 'co2_per_head_by_date')
            ->assertJsonMissing(['shift_date' => '2026-08-07']);
    }
}
