<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Date of birth of each child a participant brings (JSON list in text;
     * host MariaDB rejects json). Child prices and beds depend on age.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_participants', 'children_dobs')) {
            return;
        }

        Schema::table('competition_participants', function (Blueprint $table) {
            $table->text('children_dobs')->nullable()->after('extra_children');
        });
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('children_dobs');
        });
    }
};
