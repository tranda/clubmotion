<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saved variations of a competition's room plan (rooms, who is where,
     * stay dates, defaults), to compare and restore.
     */
    public function up(): void
    {
        if (Schema::hasTable('competition_room_snapshots')) {
            return;
        }

        Schema::create('competition_room_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            // JSON in a text column (host MariaDB rejects json).
            $table->longText('data');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competition_room_snapshots');
    }
};
