<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->foreignId('ledger_entry_id')->nullable()->after('notes')
                ->constrained('ledger_entries')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->dropForeign(['ledger_entry_id']);
            $table->dropColumn('ledger_entry_id');
        });
    }
};
