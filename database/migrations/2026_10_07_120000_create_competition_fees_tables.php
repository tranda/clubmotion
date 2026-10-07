<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Competition fees: separate from membership payments by design.
     */
    public function up(): void
    {
        Schema::create('competitions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('location')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('default_fee', 10, 2)->nullable();
            $table->string('currency', 3)->default('EUR'); // EUR or RSD
            $table->enum('status', ['planned', 'active', 'closed'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('start_date');
        });

        Schema::create('competition_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->decimal('fee_amount', 10, 2)->default(0);
            $table->enum('status', ['active', 'cancelled', 'exempt'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['competition_id', 'member_id']);
        });

        Schema::create('competition_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_participant_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('paid_at');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'other'])->nullable();
            $table->string('note')->nullable();
            // Linked cash-book entry (cash/bank_transfer payments only).
            $table->unsignedBigInteger('ledger_entry_id')->nullable()->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competition_payments');
        Schema::dropIfExists('competition_participants');
        Schema::dropIfExists('competitions');
    }
};
