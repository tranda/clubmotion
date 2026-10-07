<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Competition payments are no longer posted to the ledger. Remove the
     * entries created for them (payments themselves are kept), the link
     * column, and the 'kotizacije' category if nothing else uses it.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_payments', 'ledger_entry_id')) {
            $entryIds = DB::table('competition_payments')
                ->whereNotNull('ledger_entry_id')
                ->pluck('ledger_entry_id')
                ->all();

            // Query builder delete: bypasses LedgerEntry model hooks.
            if ($entryIds) {
                DB::table('ledger_entries')->whereIn('id', $entryIds)->delete();
            }

            Schema::table('competition_payments', function (Blueprint $table) {
                $table->dropIndex(['ledger_entry_id']);
                $table->dropColumn('ledger_entry_id');
            });
        }

        $categoryId = DB::table('ledger_categories')->where('normalized_name', 'kotizacije')->value('id');
        if ($categoryId && !DB::table('ledger_entries')->where('ledger_category_id', $categoryId)->exists()) {
            DB::table('ledger_categories')->where('id', $categoryId)->delete();
        }
    }

    public function down(): void
    {
        Schema::table('competition_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('ledger_entry_id')->nullable()->index();
        });
    }
};
