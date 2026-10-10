<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Participant role on a competition: athlete (default) or supporter.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_participants', 'role')) {
            return;
        }

        Schema::table('competition_participants', function (Blueprint $table) {
            $table->string('role', 20)->default('athlete')->after('member_id');
        });
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
