<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            // Date the member joined the club. Editable; seeded from created_at.
            $table->date('registration_date')->nullable()->after('medical_validity');
        });

        // Initial value: the date the member record was created.
        DB::table('members')
            ->whereNull('registration_date')
            ->whereNotNull('created_at')
            ->update(['registration_date' => DB::raw('DATE(created_at)')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('registration_date');
        });
    }
};
