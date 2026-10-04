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
        Schema::table('members', function (Blueprint $table) {
            // Date the member left the club. Set automatically on deactivation,
            // cleared on reactivation; filled for existing inactive members via
            // the admin /sync-deactivation-dates page.
            $table->date('deactivation_date')->nullable()->after('registration_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('deactivation_date');
        });
    }
};
