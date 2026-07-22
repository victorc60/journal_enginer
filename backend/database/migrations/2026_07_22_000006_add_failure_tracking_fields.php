<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('failures', function (Blueprint $table): void {
            $table->string('status')->default('open')->after('severity');
            $table->string('assigned_to')->nullable()->after('status');
            $table->text('parts_needed')->nullable()->after('assigned_to');
            $table->text('next_action')->nullable()->after('parts_needed');
            $table->date('due_date')->nullable()->after('next_action');
            $table->timestamp('resolved_at')->nullable()->after('due_date');
        });
    }

    public function down(): void
    {
        Schema::table('failures', function (Blueprint $table): void {
            $table->dropColumn([
                'status',
                'assigned_to',
                'parts_needed',
                'next_action',
                'due_date',
                'resolved_at',
            ]);
        });
    }
};
