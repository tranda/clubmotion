<?php

use App\Models\CompetitionPayment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Competition payments are posted to the ledger again. Re-add the link
     * column and create ledger entries for existing cash/bank payments.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('competition_payments', 'ledger_entry_id')) {
            Schema::table('competition_payments', function (Blueprint $table) {
                $table->unsignedBigInteger('ledger_entry_id')->nullable()->index()->after('note');
            });
        }

        CompetitionPayment::with('participant.competition')
            ->whereNull('ledger_entry_id')
            ->get()
            ->each(fn ($payment) => $payment->syncLedgerEntry());
    }

    public function down(): void
    {
        // Ledger entries created here are left in place.
    }
};
