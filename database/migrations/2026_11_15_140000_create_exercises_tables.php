<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Exercise library and the exercises of each training. A gym training lists its exercises
// one by one (order, sets, rest, suggested load for women and men); the exercise itself
// (illustration, muscles, how to do it) is stored once and shared by all trainings.
return new class extends Migration
{
    public function up()
    {
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
            $table->text('muscles')->nullable();
            $table->text('how_to')->nullable();
            $table->string('image_path', 500)->nullable();   // private local disk
            $table->string('image_mime', 100)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('training_exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('trainings')->cascadeOnDelete();
            $table->foreignId('exercise_id')->constrained('exercises')->restrictOnDelete();
            $table->unsignedSmallInteger('position')->default(1);
            $table->string('group', 10)->default('all');      // all | women | men
            $table->string('sets', 80)->nullable();           // e.g. 3×20, 4×15/str.
            $table->string('rest', 80)->nullable();           // e.g. 60-75 s
            $table->string('load_women', 200)->nullable();
            $table->string('load_men', 200)->nullable();
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index(['training_id', 'position']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('training_exercises');
        Schema::dropIfExists('exercises');
    }
};
