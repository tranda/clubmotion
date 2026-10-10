<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stay dates: a default check-in/check-out per competition (set in the
     * room planner) and an optional override per participant
     * (null = use the default). Room dates are derived from occupants.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('competitions', 'rooms_check_in')) {
            Schema::table('competitions', function (Blueprint $table) {
                $table->date('rooms_check_in')->nullable()->after('rooms_visible');
                $table->date('rooms_check_out')->nullable()->after('rooms_check_in');
            });
        }

        if (!Schema::hasColumn('competition_participants', 'check_in')) {
            Schema::table('competition_participants', function (Blueprint $table) {
                $table->date('check_in')->nullable()->after('can_edit_rooms');
                $table->date('check_out')->nullable()->after('check_in');
            });
        }
    }

    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->dropColumn(['rooms_check_in', 'rooms_check_out']);
        });
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn(['check_in', 'check_out']);
        });
    }
};
