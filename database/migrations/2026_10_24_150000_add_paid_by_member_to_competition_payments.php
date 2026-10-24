<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Club member who actually paid a competition payment (null = the
     * participant). paid_by keeps their name for display and history.
     */
    public function up(): void
    {
        if (Schema::hasColumn('competition_payments', 'paid_by_member_id')) {
            return;
        }
        Schema::table('competition_payments', function (Blueprint $table) {
            $table->foreignId('paid_by_member_id')->nullable()->after('paid_by')
                ->constrained('members')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('competition_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('paid_by_member_id');
        });
    }
};
