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
        Schema::table('membership_categories', function (Blueprint $table) {
            $table->boolean('is_age_based')->default(false)->after('category_name');
            $table->integer('min_age')->nullable()->after('is_age_based');
            $table->integer('max_age')->nullable()->after('min_age');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('membership_categories', function (Blueprint $table) {
            $table->dropColumn(['is_age_based', 'min_age', 'max_age']);
        });
    }
};
