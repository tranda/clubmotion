<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per participant payment: false when the money didn't go into the club's
     * cash or account, so it isn't posted to the Ledger.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_payments', 'post_to_ledger')) {
            return;
        }

        Schema::table('competition_payments', function (Blueprint $table) {
            $table->boolean('post_to_ledger')->default(true)->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('competition_payments', function (Blueprint $table) {
            $table->dropColumn('post_to_ledger');
        });
    }
};
