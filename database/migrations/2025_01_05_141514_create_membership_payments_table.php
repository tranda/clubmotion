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
        Schema::create('membership_payments', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->foreignId('member_id')->constrained()->onDelete('cascade'); // Foreign key to members table
            $table->date('payment_date'); // Column for payment date
            $table->decimal('payment_amount', 10, 2); // Column for payment amount
            $table->enum('payment_status', ['pending', 'completed', 'failed'])->default('pending'); // Column for payment status
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
        Schema::dropIfExists('membership_payments');
    }
};
