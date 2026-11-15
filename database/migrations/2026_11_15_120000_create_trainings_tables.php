<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Trainings ("Trainings" in the menu): water and gym training plans that members can read
// before they come, with attached files (PDF, images, documents).
return new class extends Migration
{
    public function up()
    {
        Schema::create('trainings', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20);                 // water | gym
            $table->string('title', 200);
            $table->date('training_date')->nullable();  // empty = general program, no fixed day
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'training_date']);
        });

        // Files are kept on the private local disk and served only through the app.
        Schema::create('training_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->string('original_name', 255);
            $table->string('path', 500);
            $table->string('mime', 150)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('training_files');
        Schema::dropIfExists('trainings');
    }
};
