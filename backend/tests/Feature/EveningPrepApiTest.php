<?php

namespace Tests\Feature;

use App\Models\EveningPrepItem;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EveningPrepApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('evening_prep_entries');
        Schema::dropIfExists('evening_preps');
        Schema::dropIfExists('evening_prep_items');

        Schema::create('evening_prep_items', function (Blueprint $table): void {
            $table->id();
            $table->string('section');
            $table->string('title');
            $table->text('details')->nullable();
            $table->unsignedInteger('sort_order')->default(100);
            $table->boolean('is_active')->default(true);
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
            $table->foreignId('evening_prep_item_id')->constrained()->cascadeOnDelete();
            $table->string('item_section');
            $table->string('item_title');
            $table->text('item_details')->nullable();
            $table->boolean('is_checked')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->unique(['evening_prep_id', 'evening_prep_item_id']);
        });

        $this->seedEveningPrepItems();
    }

    public function test_it_returns_evening_prep_payload_for_requested_date(): void
    {
        $response = $this->getJson('/api/evening-preps?date=2026-07-28');

        $response
            ->assertOk()
            ->assertJsonPath('prep_date', '2026-07-28')
            ->assertJsonPath('target_date', '2026-07-29')
            ->assertJsonCount(4, 'checklist_items')
            ->assertJsonPath('prep', null);
    }

    public function test_it_rejects_saving_prep_when_next_day_is_not_slaughter_day(): void
    {
        $item = EveningPrepItem::query()->firstOrFail();

        $response = $this->postJson('/api/evening-preps', [
            'prep_date' => '2026-07-28',
            'is_next_day_slaughter' => false,
            'entries' => [
                [
                    'evening_prep_item_id' => $item->id,
                    'is_checked' => true,
                    'note' => 'Проверил и отметил.',
                ],
            ],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Подготовка сохраняется только если на следующий день запланирован день забоя.');

        $this->assertDatabaseMissing('evening_preps', [
            'prep_date' => '2026-07-28',
        ]);
    }

    public function test_it_saves_evening_prep_for_next_day_slaughter(): void
    {
        $items = EveningPrepItem::query()->orderBy('id')->take(2)->get();

        $response = $this->postJson('/api/evening-preps', [
            'prep_date' => '2026-07-28',
            'is_next_day_slaughter' => true,
            'entries' => [
                [
                    'evening_prep_item_id' => $items[0]->id,
                    'is_checked' => true,
                    'note' => 'Шпарчан заполнен.',
                ],
                [
                    'evening_prep_item_id' => $items[1]->id,
                    'is_checked' => true,
                    'note' => 'Яма заполнена и закрыта.',
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('prep.prep_date', '2026-07-28')
            ->assertJsonPath('prep.target_date', '2026-07-29')
            ->assertJsonPath('prep.checked_count', 2);

        $this->assertDatabaseHas('evening_preps', [
            'is_next_day_slaughter' => true,
        ]);

        $this->assertSame(
            '2026-07-28',
            DB::table('evening_preps')->value('prep_date')
                ? substr((string) DB::table('evening_preps')->value('prep_date'), 0, 10)
                : null
        );

        $this->assertSame(
            '2026-07-29',
            DB::table('evening_preps')->value('target_date')
                ? substr((string) DB::table('evening_preps')->value('target_date'), 0, 10)
                : null
        );

        $this->assertDatabaseHas('evening_prep_entries', [
            'evening_prep_item_id' => $items[0]->id,
            'item_title' => $items[0]->title,
            'is_checked' => true,
            'note' => 'Шпарчан заполнен.',
        ]);
    }

    private function seedEveningPrepItems(): void
    {
        $timestamp = now();

        EveningPrepItem::query()->insert([
            [
                'section' => 'Ошпарка',
                'title' => 'Шпарчан наполнен и нагрев выставлен на 04:20',
                'details' => 'Проверить заполнение и нагрев.',
                'sort_order' => 10,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Очистка',
                'title' => 'Яма у Hercules наполнена и задвижка закрыта',
                'details' => 'Проверить яму и задвижку.',
                'sort_order' => 20,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Пар',
                'title' => 'Парогенератор выставлен на 04:20',
                'details' => 'Проверить таймер запуска.',
                'sort_order' => 30,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Охлаждение',
                'title' => 'Холодильники и камеры проверены',
                'details' => 'Проверить охлаждение и вентиляцию.',
                'sort_order' => 40,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ]);
    }
}
