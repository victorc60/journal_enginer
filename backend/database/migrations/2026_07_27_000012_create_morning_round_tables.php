<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->unique(
                ['morning_round_id', 'morning_round_item_id'],
                'morning_round_entries_round_item_unique'
            );
        });

        $timestamp = now();

        DB::table('morning_round_items')->insert([
            [
                'section' => 'Общий осмотр',
                'title' => 'Линия Marel и общая готовность',
                'details' => 'Проверить чистоту, посторонние шумы, утечки, ограждения и готовность линии к запуску.',
                'sort_order' => 10,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Конвейеры и транспорт',
                'title' => 'Станция снятия путовых цепей',
                'details' => 'Осмотреть два цилиндра, датчики, состояние направляющих и работу узла перед стартом.',
                'sort_order' => 20,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Конвейеры и транспорт',
                'title' => 'Вертикальный конвейер',
                'details' => 'Проверить привод, цепь, рельс, карманы и реверсивную секцию.',
                'sort_order' => 30,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Конвейеры и транспорт',
                'title' => 'Главный конвейер',
                'details' => 'Проверить трассу цепи, натяжение, привод и работу поворотных шкивов.',
                'sort_order' => 40,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Конвейеры и транспорт',
                'title' => 'Конвейер для кишок',
                'details' => 'Осмотреть подвесы, синхронизацию подачи воды и общее состояние подвесного конвейера.',
                'sort_order' => 50,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Оглушение',
                'title' => 'Система оглушения Backloader XXL1',
                'details' => 'Проверить подачу животных, шторки, механизмы перемещения и готовность секции.',
                'sort_order' => 60,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Оглушение',
                'title' => 'Система CO2-оглушения',
                'details' => 'Осмотреть подачу CO2, датчики, безопасность зоны и общее состояние камеры.',
                'sort_order' => 70,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Ошпаривание и очистка',
                'title' => 'Ошпариватель Turn-O-Matic',
                'details' => 'Проверить температуру, подачу воды, пар, барабан и общее состояние машины.',
                'sort_order' => 80,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Ошпаривание и очистка',
                'title' => 'Скребмашина Hercules',
                'details' => 'Осмотреть скребковые вальцы, распыление воды, привод и выгрузной шнек.',
                'sort_order' => 90,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Опаливание',
                'title' => 'Опалочная печь Spitfire',
                'details' => 'Проверить розжиг, горелки, подачу газа, пламя и шкаф управления.',
                'sort_order' => 100,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Вспомогательные системы',
                'title' => 'Парогенератор Clayton',
                'details' => 'Осмотреть рабочие параметры пара, подпитку и отсутствие тревог по паровой системе.',
                'sort_order' => 110,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Вспомогательные системы',
                'title' => 'Система водоподготовки',
                'details' => 'Проверить давление, фильтрацию, подпитку водой и общее состояние узла.',
                'sort_order' => 120,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('morning_round_entries');
        Schema::dropIfExists('morning_rounds');
        Schema::dropIfExists('morning_round_items');
    }
};
