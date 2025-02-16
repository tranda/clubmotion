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
        Schema::create('membership_categories', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('category_name'); // Column for category name
            $table->text('description')->nullable(); // Column for description (nullable)
            $table->timestamps(); // Automatically created `created_at` and `updated_at` columns
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('membership_categories');
    }
};
