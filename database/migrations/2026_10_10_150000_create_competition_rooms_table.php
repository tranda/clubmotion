<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Room planner: numbered rooms per competition, and which room each
     * participant (with their additional people) is placed in.
     */
    public function up(): void
    {
        if (!Schema::hasTable('competition_rooms')) {
            Schema::create('competition_rooms', function (Blueprint $table) {
                $table->id();
                $table->foreignId('competition_id')->constrained()->cascadeOnDelete();
                $table->unsignedSmallInteger('number');
                // Optional title, e.g. the hotel room number "205"; falls back to "Room {number}".
                $table->string('name', 50)->nullable();
                $table->unsignedTinyInteger('beds');
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('competition_participants', 'competition_room_id')) {
            Schema::table('competition_participants', function (Blueprint $table) {
                $table->foreignId('competition_room_id')->nullable()->after('preferred_room')
                    ->constrained('competition_rooms')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('competition_participants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('competition_room_id');
        });
        Schema::dropIfExists('competition_rooms');
    }
};
