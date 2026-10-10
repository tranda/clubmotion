<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Whether members can see the competition's room plan (read-only).
     */
    public function up(): void
    {
        if (Schema::hasColumn('competitions', 'rooms_visible')) {
            return;
        }

        Schema::table('competitions', function (Blueprint $table) {
            $table->boolean('rooms_visible')->default(false)->after('room_counts');
        });
    }

    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->dropColumn('rooms_visible');
        });
    }
};
