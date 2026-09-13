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
        Schema::create('join_requests', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->date('date_of_birth')->nullable();
            $table->text('message')->nullable();          // applicant's note ("why I want to join")
            $table->string('status')->default('pending'); // pending | processing | approved | rejected
            $table->text('admin_notes')->nullable();       // internal notes, not shown to applicant
            $table->foreignId('member_id')->nullable()     // set when a member is created from the request
                ->constrained('members')->nullOnDelete();
            $table->foreignId('resolved_by')->nullable()   // admin/superuser who resolved it
                ->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('email');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('join_requests');
    }
};
