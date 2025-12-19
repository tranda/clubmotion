<?php

use Illuminate\Database\Migrations\Migration;
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
        // Allow NULL for payment_status column using raw SQL
        DB::statement('ALTER TABLE membership_payments MODIFY payment_status VARCHAR(20) NULL');

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

        // Make column NOT NULL again using raw SQL
        DB::statement("ALTER TABLE membership_payments MODIFY payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    }
};
