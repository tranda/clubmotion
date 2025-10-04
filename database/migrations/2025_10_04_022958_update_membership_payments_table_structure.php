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
        // First, drop the old table if it exists with old structure
        Schema::dropIfExists('membership_payments');

        // Create the new table with updated structure
        Schema::create('membership_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->integer('payment_year');
            $table->tinyInteger('payment_month');
            $table->decimal('expected_amount', 10, 2)->nullable();
            $table->decimal('paid_amount', 10, 2)->nullable();
            $table->enum('payment_status', ['pending', 'paid', 'exempt', 'overdue'])->default('pending');
            $table->string('exemption_reason', 50)->nullable();
            $table->date('payment_date')->nullable();
            $table->enum('payment_method', ['cash', 'card', 'bank_transfer'])->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['member_id', 'payment_year', 'payment_month']);
            $table->index('member_id');
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

        // Recreate old structure
        Schema::create('membership_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->date('payment_date');
            $table->decimal('payment_amount', 10, 2);
            $table->enum('payment_status', ['pending', 'completed', 'failed'])->default('pending');
            $table->timestamps();
        });
    }
};
