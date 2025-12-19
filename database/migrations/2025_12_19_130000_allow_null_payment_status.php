<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Allow NULL for payment_status column
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->string('payment_status', 20)->nullable()->change();
        });

        // Update existing 2026 pending records to NULL
        DB::table('membership_payments')
            ->where('payment_year', 2026)
            ->where('payment_status', 'pending')
            ->update(['payment_status' => null]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Revert NULL status back to pending
        DB::table('membership_payments')
            ->whereNull('payment_status')
            ->update(['payment_status' => 'pending']);

        // Make column NOT NULL again
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->string('payment_status', 20)->nullable(false)->default('pending')->change();
        });
    }
};
