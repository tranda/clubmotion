<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Member gender ('M' / 'F') and EDBF (federation) ID.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            if (!Schema::hasColumn('members', 'gender')) {
                $table->string('gender', 1)->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('members', 'edbf_id')) {
                $table->string('edbf_id', 50)->nullable()->after('membership_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['gender', 'edbf_id']);
        });
    }
};
