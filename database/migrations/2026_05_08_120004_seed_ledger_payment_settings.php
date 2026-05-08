<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        $now = now();
        DB::table('payment_settings')->insertOrIgnore([
            [
                'key' => 'ledger_petty_cash_float_rsd',
                'value' => '0',
                'description' => 'Petty cash float (kusur) in RSD held aside as change',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down()
    {
        DB::table('payment_settings')
            ->where('key', 'ledger_petty_cash_float_rsd')
            ->delete();
    }
};
