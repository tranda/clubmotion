<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Update existing session types
        DB::table('session_types')->where('name', 'Match')->update(['name' => 'Competition']);
        DB::table('session_types')->where('name', 'Event')->update(['name' => 'Other']);

        // Delete Tournament if it exists
        DB::table('session_types')->where('name', 'Tournament')->delete();
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Revert the changes
        DB::table('session_types')->where('name', 'Competition')->update(['name' => 'Match']);
        DB::table('session_types')->where('name', 'Other')->update(['name' => 'Event']);

        // Recreate Tournament
        DB::table('session_types')->insert([
            'name' => 'Tournament',
            'color' => '#8B5CF6',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
