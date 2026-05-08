<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ledger_import_staging', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('ledger_import_batches')->cascadeOnDelete();
            $table->string('tab_gid', 50);
            $table->string('tab_label', 100);
            $table->text('raw_row_json');
            $table->date('parsed_date')->nullable();
            $table->enum('parsed_type', ['income', 'expense'])->nullable();
            $table->enum('parsed_bucket', ['cash', 'bank', 'eur'])->nullable();
            $table->decimal('parsed_amount', 12, 2)->nullable();
            $table->string('parsed_description', 255)->nullable();
            $table->string('normalized_description', 255)->nullable();
            $table->foreignId('suggested_category_id')->nullable()->constrained('ledger_categories')->nullOnDelete();
            $table->foreignId('mapped_category_id')->nullable()->constrained('ledger_categories')->nullOnDelete();
            $table->enum('action', ['import_new_category', 'map_existing', 'import_uncategorized', 'skip'])->nullable();
            $table->text('error')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['batch_id', 'tab_gid']);
            $table->index(['batch_id', 'normalized_description']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ledger_import_staging');
    }
};
