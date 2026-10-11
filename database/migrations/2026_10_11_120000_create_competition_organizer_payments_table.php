<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payments the club makes to a competition's organizer (entry fees,
     * accommodation, …). Cash/bank ones are posted to the Ledger as expenses.
     */
    public function up(): void
    {
        if (Schema::hasTable('competition_organizer_payments')) {
            return;
        }

        Schema::create('competition_organizer_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('paid_at');
            $table->string('payment_method', 20);
            $table->string('description')->nullable();
            $table->text('note')->nullable();
            // False when paid from somewhere other than the club's accounts.
            $table->boolean('post_to_ledger')->default(true);
            $table->foreignId('ledger_category_id')->nullable()->constrained('ledger_categories')->nullOnDelete();
            $table->unsignedBigInteger('ledger_entry_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competition_organizer_payments');
    }
};
