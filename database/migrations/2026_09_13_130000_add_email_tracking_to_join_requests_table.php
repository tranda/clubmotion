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
        Schema::table('join_requests', function (Blueprint $table) {
            $table->timestamp('last_emailed_at')->nullable()->after('resolved_at');
            $table->integer('emails_sent')->default(0)->after('last_emailed_at');
            $table->string('last_email_subject')->nullable()->after('emails_sent');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('join_requests', function (Blueprint $table) {
            $table->dropColumn(['last_emailed_at', 'emails_sent', 'last_email_subject']);
        });
    }
};
