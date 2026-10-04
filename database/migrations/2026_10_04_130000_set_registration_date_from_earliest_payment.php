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
        // If a member's earliest paid month is before their registration_date,
        // move registration_date to the first day of that month. Never moves a
        // date later; members without a paid month are unchanged.
        $earliest = DB::table('membership_payments')
            ->where(function ($q) {
                $q->where('payment_status', 'paid')->orWhere('paid_amount', '>', 0);
            })
            ->select('member_id', DB::raw('MIN(payment_year * 100 + payment_month) as ym'))
            ->groupBy('member_id')
            ->get();

        foreach ($earliest as $row) {
            $year = intdiv((int) $row->ym, 100);
            $month = (int) $row->ym % 100;

            $target = sprintf('%04d-%02d-01', $year, $month);

            DB::table('members')
                ->where('id', $row->member_id)
                ->where(function ($q) use ($target) {
                    $q->whereNull('registration_date')->orWhere('registration_date', '>', $target);
                })
                ->update(['registration_date' => $target]);
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
