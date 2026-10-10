<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Participants allowed to edit the competition's room planner
     * (besides admins and superusers).
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_participants', 'can_edit_rooms')) {
            return;
        }

        Schema::table('competition_participants', function (Blueprint $table) {
            $table->boolean('can_edit_rooms')->default(false)->after('competition_room_id');
        });
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('can_edit_rooms');
        });
    }
};
