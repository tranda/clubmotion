<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payment currency. `amount` stays in the competition's currency (what the
     * payment counts as); when paid in another currency, `currency` and
     * `currency_amount` hold what was actually paid (used for the Ledger).
     */
    public function up(): void
    {
        foreach (['competition_payments', 'competition_organizer_payments'] as $tableName) {
            if (Schema::hasColumn($tableName, 'currency')) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) {
                $table->string('currency', 3)->nullable()->after('amount');
                $table->decimal('currency_amount', 12, 2)->nullable()->after('currency');
            });
        }
    }

    public function down(): void
    {
        foreach (['competition_payments', 'competition_organizer_payments'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['currency', 'currency_amount']);
            });
        }
    }
};
