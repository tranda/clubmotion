<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additional people placed apart from their participant in the room
     * planner: JSON in text {"supporter:1": room_id|null, …}. A key present
     * means that person is separated (null = not in a room yet).
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_participants', 'split_extras')) {
            return;
        }

        Schema::table('competition_participants', function (Blueprint $table) {
            $table->text('split_extras')->nullable()->after('competition_room_id');
        });
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('split_extras');
        });
    }
};
