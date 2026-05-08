<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ledger_import_batches', function (Blueprint $table) {
            $table->id();
            $table->string('source_url', 500);
            $table->enum('status', ['staging', 'committed', 'cancelled'])->default('staging');
            $table->text('summary_json')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('ledger_import_batches');
    }
};
