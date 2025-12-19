<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->boolean('is_annual_payment')->default(false)->after('payment_status');
            $table->string('annual_payment_group_id', 50)->nullable()->after('is_annual_payment');
            $table->index('annual_payment_group_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('membership_payments', function (Blueprint $table) {
            $table->dropIndex(['annual_payment_group_id']);
            $table->dropColumn(['is_annual_payment', 'annual_payment_group_id']);
        });
    }
};
