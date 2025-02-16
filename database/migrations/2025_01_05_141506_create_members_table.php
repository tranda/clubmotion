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
        Schema::create('members', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('name'); // Member's name
            $table->string('membership_number')->unique(); // Membership number
            $table->date('date_of_birth'); // Date of birth
            $table->text('address'); // Member's address
            $table->string('phone'); // Phone number
            $table->string('email')->unique(); // Email address
            $table->foreignId('category_id')->constrained('membership_categories')->onDelete('cascade'); // Foreign key to membership_categories table
            $table->date('medical_validity'); // Medical validity date
            $table->string('profile_image_url')->nullable(); // Profile image URL (nullable)
            $table->string('password_hash'); // Password hash (if applicable)
            $table->boolean('is_active')->default(true); // Active status (default true)
            $table->string('image')->nullable(); // Image column (nullable)
            $table->timestamps(); // Timestamps for created_at and updated_at
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('members');
    }
};
