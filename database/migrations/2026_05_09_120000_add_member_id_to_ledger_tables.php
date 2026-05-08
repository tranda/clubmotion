<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->foreignId('member_id')->nullable()->after('ledger_category_id')
                ->constrained('members')->nullOnDelete();
            $table->index('member_id');
        });

        Schema::table('ledger_import_staging', function (Blueprint $table) {
            $table->foreignId('suggested_member_id')->nullable()->after('mapped_category_id')
                ->constrained('members')->nullOnDelete();
            $table->foreignId('mapped_member_id')->nullable()->after('suggested_member_id')
                ->constrained('members')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('ledger_import_staging', function (Blueprint $table) {
            $table->dropForeign(['suggested_member_id']);
            $table->dropForeign(['mapped_member_id']);
            $table->dropColumn(['suggested_member_id', 'mapped_member_id']);
        });
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->dropIndex(['member_id']);
            $table->dropColumn('member_id');
        });
    }
};
