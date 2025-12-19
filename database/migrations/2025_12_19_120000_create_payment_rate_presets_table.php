<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('payment_rate_presets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->tinyInteger('start_month');
            $table->tinyInteger('end_month');
            $table->decimal('rate', 10, 2);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Insert default presets
        DB::table('payment_rate_presets')->insert([
            ['name' => 'Set all to 2500', 'start_month' => 1, 'end_month' => 12, 'rate' => 2500, 'sort_order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Jan-Mar: 2500', 'start_month' => 1, 'end_month' => 3, 'rate' => 2500, 'sort_order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Apr-May: 500', 'start_month' => 4, 'end_month' => 5, 'rate' => 500, 'sort_order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Jun-Sep: 3000', 'start_month' => 6, 'end_month' => 9, 'rate' => 3000, 'sort_order' => 4, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('payment_rate_presets');
    }
};
