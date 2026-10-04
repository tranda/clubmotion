<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For each member with at least one paid month, set registration_date
        // to the first day of their earliest paid month. Members without a
        // paid month keep their current registration_date.
        $earliest = DB::table('membership_payments')
            ->where('payment_status', 'paid')
            ->select('member_id', DB::raw('MIN(payment_year * 100 + payment_month) as ym'))
            ->groupBy('member_id')
            ->get();

        foreach ($earliest as $row) {
            $year = intdiv((int) $row->ym, 100);
            $month = (int) $row->ym % 100;

            DB::table('members')
                ->where('id', $row->member_id)
                ->update(['registration_date' => sprintf('%04d-%02d-01', $year, $month)]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data-only migration; previous values are not restored.
    }
};
