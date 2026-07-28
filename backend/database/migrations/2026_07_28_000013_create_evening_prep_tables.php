<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->unique(
                ['evening_prep_id', 'evening_prep_item_id'],
                'evening_prep_entries_prep_item_unique'
            );
        });

        $timestamp = now();

        DB::table('evening_prep_items')->insert([
            [
                'section' => 'Ошпарка',
                'title' => 'Шпарчан наполнен и нагрев выставлен на 04:20',
                'details' => 'Проверить, что шпарчан наполнен и время нагрева установлено на 04:20 утра.',
                'sort_order' => 10,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Очистка',
                'title' => 'Яма у Hercules наполнена и задвижка закрыта',
                'details' => 'Убедиться, что яма наполнена, а задвижка закрыта перед завтрашним запуском.',
                'sort_order' => 20,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Пар',
                'title' => 'Парогенератор Clayton выставлен на запуск в 04:20',
                'details' => 'Проверить таймер запуска парогенератора и убедиться, что старт назначен на 04:20 утра.',
                'sort_order' => 30,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'section' => 'Охлаждение',
                'title' => 'Холодильники, вентиляция и камеры проверены',
                'details' => 'Проверить холодильники, вентиляцию и холодильные камеры, чтобы утром все работало штатно.',
                'sort_order' => 40,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('evening_prep_entries');
        Schema::dropIfExists('evening_preps');
        Schema::dropIfExists('evening_prep_items');
    }
};
