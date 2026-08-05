<?php

namespace Tests\Feature;

use App\Models\MorningRoundItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MorningRoundApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('morning_round_entries');
        Schema::dropIfExists('morning_rounds');
        Schema::dropIfExists('morning_round_items');

        Schema::create('morning_round_items', function (Blueprint $table): void {
            $table->id();
            $table->string('section');
            $table->string('title');
            $table->text('details')->nullable();
            $table->unsignedInteger('sort_order')->default(100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('morning_rounds', function (Blueprint $table): void {
            $table->id();
            $table->date('round_date')->unique();
            $table->boolean('is_slaughter_day')->default(true);
            $table->timestamps();
        });

        Schema::create('morning_round_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('morning_round_id')->constrained()->cascadeOnDelete();
            $table->foreignId('morning_round_item_id')->constrained()->cascadeOnDelete();
            $table->string('item_section');
            $table->string('item_title');
            $table->text('item_details')->nullable();
            $table->boolean('is_checked')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->unique(['morning_round_id', 'morning_round_item_id']);
        });

        $this->seedMorningRoundItems();
    }

    public function test_it_returns_morning_round_payload_for_requested_date(): void
    {
        $response = $this->getJson('/api/morning-rounds?date=2026-07-27');

        $response
            ->assertOk()
            ->assertJsonPath('date', '2026-07-27')
            ->assertJsonPath('expected_is_slaughter_day', true)
            ->assertJsonCount(3, 'template_items')
            ->assertJsonCount(3, 'checklist_items')
            ->assertJsonPath('round', null);
    }

    public function test_it_marks_friday_as_non_slaughter_day_by_schedule(): void
    {
        $response = $this->getJson('/api/morning-rounds?date=2026-08-07');

        $response
            ->assertOk()
            ->assertJsonPath('date', '2026-08-07')
            ->assertJsonPath('expected_is_slaughter_day', false);

        $item = MorningRoundItem::query()->firstOrFail();

        $saveResponse = $this->postJson('/api/morning-rounds', [
            'round_date' => '2026-08-07',
            'is_slaughter_day' => true,
            'entries' => [
                [
                    'morning_round_item_id' => $item->id,
                    'is_checked' => true,
                    'note' => 'Проверил.',
                ],
            ],
        ]);

        $saveResponse
            ->assertStatus(422)
            ->assertJsonPath('message', 'По графику обход сохраняется только для рабочих дней с воскресенья по четверг.');
    }

    public function test_it_rejects_saving_non_slaughter_day_rounds(): void
    {
        $item = MorningRoundItem::query()->firstOrFail();

        $response = $this->postJson('/api/morning-rounds', [
            'round_date' => '2026-07-27',
            'is_slaughter_day' => false,
            'entries' => [
                [
                    'morning_round_item_id' => $item->id,
                    'is_checked' => true,
                    'note' => 'Проверил и оставил заметку.',
                ],
            ],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Обход сохраняется только для дней забоя.');

        $this->assertDatabaseMissing('morning_rounds', [
            'round_date' => '2026-07-27',
        ]);
    }

    public function test_it_saves_round_entries_for_slaughter_day(): void
    {
        $items = MorningRoundItem::query()->orderBy('id')->take(2)->get();

        $response = $this->postJson('/api/morning-rounds', [
            'round_date' => '2026-07-27',
            'is_slaughter_day' => true,
            'entries' => [
                [
                    'morning_round_item_id' => $items[0]->id,
                    'is_checked' => true,
                    'note' => 'Проверил перед запуском.',
                ],
                [
                    'morning_round_item_id' => $items[1]->id,
                    'is_checked' => false,
                    'note' => '',
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('round.round_date', '2026-07-27')
            ->assertJsonPath('round.checked_count', 1);

        $this->assertDatabaseHas('morning_rounds', [
            'is_slaughter_day' => true,
        ]);

        $this->assertSame(
            '2026-07-27',
            DB::table('morning_rounds')->value('round_date')
                ? substr((string) DB::table('morning_rounds')->value('round_date'), 0, 10)
                : null
        );

        $this->assertDatabaseHas('morning_round_entries', [
            'morning_round_item_id' => $items[0]->id,
            'item_title' => $items[0]->title,
            'is_checked' => true,
            'note' => 'Проверил перед запуском.',
        ]);

        $this->assertDatabaseHas('morning_round_entries', [
            'morning_round_item_id' => $items[1]->id,
            'item_title' => $items[1]->title,
            'is_checked' => false,
            'note' => null,
        ]);
    }

    public function test_it_can_create_update_and_archive_template_items(): void
    {
        $createResponse = $this->postJson('/api/morning-round-items', [
            'section' => 'Новый раздел',
            'title' => 'Новый пункт обхода',
            'details' => 'Проверить новый узел.',
            'sort_order' => 250,
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('section', 'Новый раздел')
            ->assertJsonPath('title', 'Новый пункт обхода');

        $itemId = $createResponse->json('id');

        $this->assertDatabaseHas('morning_round_items', [
            'id' => $itemId,
            'section' => 'Новый раздел',
            'title' => 'Новый пункт обхода',
            'is_active' => true,
        ]);

        $updateResponse = $this->patchJson("/api/morning-round-items/{$itemId}", [
            'section' => 'Обновленный раздел',
            'title' => 'Обновленный пункт',
            'details' => 'Проверить и отрегулировать.',
            'sort_order' => 260,
        ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('section', 'Обновленный раздел')
            ->assertJsonPath('title', 'Обновленный пункт')
            ->assertJsonPath('sort_order', 260);

        $this->assertDatabaseHas('morning_round_items', [
            'id' => $itemId,
            'section' => 'Обновленный раздел',
            'title' => 'Обновленный пункт',
            'sort_order' => 260,
            'is_active' => true,
        ]);

        $deleteResponse = $this->deleteJson("/api/morning-round-items/{$itemId}");

        $deleteResponse
            ->assertOk()
            ->assertJsonPath('is_active', false);

        $this->assertDatabaseHas('morning_round_items', [
            'id' => $itemId,
            'is_active' => false,
        ]);
    }

    private function seedMorningRoundItems(): void
    {
        $timestamp = now();

        MorningRoundItem::query()->insert([
            [
                'section' => 'Общий осмотр',
                'title' => 'Линия Marel и общая готовность',
                'details' => 'Проверить чистоту и общий запуск линии.',
                'sort_order' => 10,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Конвейеры и транспорт',
                'title' => 'Вертикальный конвейер',
                'details' => 'Проверить цепь, привод и направляющие.',
                'sort_order' => 20,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Опаливание',
                'title' => 'Опалочная печь Spitfire',
                'details' => 'Проверить розжиг и подачу газа.',
                'sort_order' => 30,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ]);
    }
}
