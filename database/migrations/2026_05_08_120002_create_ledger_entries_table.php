<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->date('entry_date');
            $table->enum('type', ['income', 'expense']);
            $table->enum('bucket', ['cash', 'bank', 'eur']);
            $table->decimal('amount', 12, 2);
            $table->string('description', 255);
            $table->foreignId('ledger_category_id')->nullable()->constrained('ledger_categories')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->enum('source', ['import', 'manual'])->default('manual');
            $table->char('source_hash', 64)->nullable();
            $table->foreignId('import_batch_id')->nullable()->constrained('ledger_import_batches')->nullOnDelete();
            $table->smallInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['entry_date', 'bucket']);
            $table->index('ledger_category_id');
            $table->index('source_hash');
            $table->index(['type', 'bucket']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ledger_entries');
    }
};
