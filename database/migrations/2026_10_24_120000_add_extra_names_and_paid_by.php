<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Names for a participant's additional people (JSON in text:
     * {"athlete": [...], "supporter": [...], "child": [...]}), and on each
     * payment who paid it and for which person of the party ("supporter:1").
     */
    public function up(): void
    {
        if (!Schema::hasColumn('competition_participants', 'extra_names')) {
            Schema::table('competition_participants', function (Blueprint $table) {
                $table->text('extra_names')->nullable()->after('split_extras');
            });
        }
        if (!Schema::hasColumn('competition_payments', 'paid_by')) {
            Schema::table('competition_payments', function (Blueprint $table) {
                $table->string('paid_by', 100)->nullable()->after('note');
                $table->string('party_slot', 20)->nullable()->after('paid_by');
            });
        }
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('extra_names');
        });
        Schema::table('competition_payments', function (Blueprint $table) {
            $table->dropColumn(['paid_by', 'party_slot']);
        });
    }
};
