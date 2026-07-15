<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
