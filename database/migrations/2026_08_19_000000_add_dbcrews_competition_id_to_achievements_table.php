<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('achievements', function (Blueprint $table) {
            // Stable dbcrews competition id, used as a rename-proof dedupe key.
            // Nullable: existing rows (CSV import / older pulls) won't have one.
            $table->unsignedBigInteger('dbcrews_competition_id')->nullable()->after('event_name');
            $table->index(['dbcrews_competition_id', 'member_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('achievements', function (Blueprint $table) {
            $table->dropIndex(['dbcrews_competition_id', 'member_id']);
            $table->dropColumn('dbcrews_competition_id');
        });
    }
};
