<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        DB::statement("ALTER TABLE ledger_entries MODIFY COLUMN bucket ENUM('cash', 'bank', 'cash_eur', 'eur') NOT NULL");
        DB::statement("ALTER TABLE ledger_import_staging MODIFY COLUMN parsed_bucket ENUM('cash', 'bank', 'cash_eur', 'eur') NULL");
    }

    public function down()
    {
        DB::statement("UPDATE ledger_entries SET bucket = 'eur' WHERE bucket = 'cash_eur'");
        DB::statement("UPDATE ledger_import_staging SET parsed_bucket = 'eur' WHERE parsed_bucket = 'cash_eur'");
        DB::statement("ALTER TABLE ledger_entries MODIFY COLUMN bucket ENUM('cash', 'bank', 'eur') NOT NULL");
        DB::statement("ALTER TABLE ledger_import_staging MODIFY COLUMN parsed_bucket ENUM('cash', 'bank', 'eur') NULL");
    }
};
