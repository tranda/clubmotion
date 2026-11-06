<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Staff notebook ("Notes" in the menu). The older `notes` table belongs to Custom payments.
return new class extends Migration
{
    public function up()
    {
        Schema::create('admin_notes', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->longText('body')->nullable();       // editor document (JSON)
            $table->text('body_text')->nullable();      // plain text, for search and previews
            $table->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('member_id');
            $table->index('updated_at');
        });

        // Pasted images and attachments. Stored on the private local disk and served
        // only through the app, never from a public URL.
        Schema::create('admin_note_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_note_id')->nullable()->constrained('admin_notes')->cascadeOnDelete();
            $table->string('kind', 20);                 // image | attachment
            $table->string('original_name', 255);
            $table->string('path', 500);
            $table->string('mime', 150)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['admin_note_id', 'kind']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('admin_note_files');
        Schema::dropIfExists('admin_notes');
    }
};
