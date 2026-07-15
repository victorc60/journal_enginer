<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shift_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->text('content');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_notes');
    }
};
