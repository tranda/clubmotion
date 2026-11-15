<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Video links on trainings (YouTube/Vimeo or any other address).
// Text with an array cast on the model: the host's MariaDB has no json column type.
return new class extends Migration
{
    public function up()
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->text('links')->nullable()->after('description');
        });
    }

    public function down()
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropColumn('links');
        });
    }
};
