<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additional people a participant brings: athletes, supporters, children.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_participants', 'extra_athletes')) {
            return;
        }

        Schema::table('competition_participants', function (Blueprint $table) {
            $table->unsignedSmallInteger('extra_athletes')->default(0)->after('status');
            $table->unsignedSmallInteger('extra_supporters')->default(0)->after('extra_athletes');
            $table->unsignedSmallInteger('extra_children')->default(0)->after('extra_supporters');
        });
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn(['extra_athletes', 'extra_supporters', 'extra_children']);
        });
    }
};
