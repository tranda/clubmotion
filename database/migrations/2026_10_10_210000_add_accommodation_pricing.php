<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Accommodation pricing per competition (JSON in text: prices per person by
     * room type for the package, supporter discount, charge empty beds) and the
     * accommodation amount last applied to each participant's fee.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('competitions', 'accommodation')) {
            Schema::table('competitions', function (Blueprint $table) {
                $table->text('accommodation')->nullable()->after('rooms_check_out');
            });
        }

        if (!Schema::hasColumn('competition_participants', 'accommodation_applied')) {
            Schema::table('competition_participants', function (Blueprint $table) {
                $table->decimal('accommodation_applied', 10, 2)->default(0)->after('fee_amount');
            });
        }
    }

    public function down(): void
    {
        Schema::table('competitions', function (Blueprint $table) {
            $table->dropColumn('accommodation');
        });
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropColumn('accommodation_applied');
        });
    }
};
