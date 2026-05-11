<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Rename the existing "Membership" ledger category to "članarina" so the
        // category label rendered on Ledger entries (created by the Payments
        // page) is in Serbian. We update in place so historical entries keep
        // their category_id pointer and display the new name automatically.
        //
        // If a "članarina" row already exists, the old "Membership" row is
        // pointed-at by historical entries (if any) and we merge them by
        // repointing those entries first, then deleting the orphan row.

        $clanarina = DB::table('ledger_categories')
            ->where('normalized_name', 'članarina')
            ->first();

        $membership = DB::table('ledger_categories')
            ->where('normalized_name', 'membership')
            ->first();

        if ($membership && $clanarina) {
            // Both exist — merge: repoint references, then delete the old row.
            DB::table('ledger_entries')
                ->where('ledger_category_id', $membership->id)
                ->update(['ledger_category_id' => $clanarina->id]);

            DB::table('ledger_import_staging')
                ->where('suggested_category_id', $membership->id)
                ->update(['suggested_category_id' => $clanarina->id]);
            DB::table('ledger_import_staging')
                ->where('mapped_category_id', $membership->id)
                ->update(['mapped_category_id' => $clanarina->id]);

            DB::table('ledger_categories')->where('id', $membership->id)->delete();
            return;
        }

        if ($membership) {
            DB::table('ledger_categories')
                ->where('id', $membership->id)
                ->update([
                    'name' => 'članarina',
                    'normalized_name' => 'članarina',
                    'updated_at' => now(),
                ]);
        }
    }

    public function down()
    {
        DB::table('ledger_categories')
            ->where('normalized_name', 'članarina')
            ->update([
                'name' => 'Membership',
                'normalized_name' => 'membership',
                'updated_at' => now(),
            ]);
    }
};
