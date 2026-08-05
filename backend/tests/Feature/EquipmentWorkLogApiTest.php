<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EquipmentWorkLogApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('equipment_work_logs');
        Schema::dropIfExists('handover_items');
        Schema::dropIfExists('maintenance_events');
        Schema::dropIfExists('failures');
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

        Schema::create('maintenance_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->nullable();
            $table->foreignId('equipment_id')->nullable();
            $table->string('equipment_name')->nullable();
            $table->text('action');
            $table->text('parts_used')->nullable();
            $table->text('notes')->nullable();
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

        Schema::create('equipment_work_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->date('performed_on');
            $table->text('action');
            $table->text('parts_used')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function test_it_saves_manual_equipment_work_logs_and_returns_them_in_equipment_history(): void
    {
        $equipmentId = \DB::table('equipment')->insertGetId([
            'name' => 'Автоматическая станция снятия путовых цепей',
            'category' => 'Конвейеры и транспорт',
            'configuration' => 'Два цилиндра',
            'notes' => 'История работ по узлу.',
            'service_points' => json_encode(['Цилиндр 1', 'Цилиндр 2']),
            'common_issues' => json_encode([
                [
                    'problem' => 'Подтекание сальников',
                    'action' => 'Проверить износ и заменить комплект.',
                ],
            ]),
        ]);

        $storeResponse = $this->postJson("/api/equipment/{$equipmentId}/work-logs", [
            'performed_on' => '2026-08-03',
            'action' => 'Заменили сальники на двух цилиндрах',
            'parts_used' => 'Комплект сальников',
            'notes' => 'После замены проверили ход обоих цилиндров.',
        ]);

        $storeResponse
            ->assertCreated()
            ->assertJsonPath('message', 'Работа по узлу сохранена.')
            ->assertJsonPath('work_log.equipment_id', $equipmentId)
            ->assertJsonPath('work_log.performed_on', '2026-08-03')
            ->assertJsonPath('work_log.action', 'Заменили сальники на двух цилиндрах');

        $this->assertDatabaseHas('equipment_work_logs', [
            'equipment_id' => $equipmentId,
            'performed_on' => '2026-08-03 00:00:00',
            'action' => 'Заменили сальники на двух цилиндрах',
            'parts_used' => 'Комплект сальников',
        ]);

        $detailResponse = $this->getJson("/api/equipment/{$equipmentId}");

        $detailResponse
            ->assertOk()
            ->assertJsonPath('summary.manual_work_logs_count', 1)
            ->assertJsonPath('summary.work_history_count', 1)
            ->assertJsonCount(1, 'equipment.work_logs')
            ->assertJsonPath('equipment.work_logs.0.action', 'Заменили сальники на двух цилиндрах')
            ->assertJsonPath('equipment.work_logs.0.parts_used', 'Комплект сальников');
    }
}
