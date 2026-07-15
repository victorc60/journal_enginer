<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('failures', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->nullable()->constrained('equipment')->nullOnDelete();
            $table->string('equipment_name')->nullable();
            $table->text('problem');
            $table->text('cause')->nullable();
            $table->text('solution')->nullable();
            $table->integer('downtime_minutes')->nullable();
            $table->string('severity')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('failures');
    }
};
