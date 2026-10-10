<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Accommodation planner: rooms available per competition (by bed count)
     * and each participant's preferred room size.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('competitions', 'room_counts')) {
            Schema::table('competitions', function (Blueprint $table) {
                // {"1":0,"2":4,...}; text, not json (host MariaDB rejects json).
                $table->text('room_counts')->nullable()->after('notes');
            });
        }

        if (!Schema::hasColumn('competition_participants', 'preferred_room')) {
            Schema::table('competition_participants', function (Blueprint $table) {
                $table->unsignedTinyInteger('preferred_room')->nullable()->after('extra_children');
            });
        }
    }

    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->dropColumn('room_counts');
        });
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('preferred_room');
        });
    }
};
