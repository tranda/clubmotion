<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SessionType;

class SessionTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $sessionTypes = [
            ['name' => 'Training', 'color' => '#3B82F6'], // Blue
            ['name' => 'Match', 'color' => '#10B981'], // Green
            ['name' => 'Event', 'color' => '#F59E0B'], // Orange
            ['name' => 'Tournament', 'color' => '#8B5CF6'], // Purple
        ];

        foreach ($sessionTypes as $type) {
            SessionType::firstOrCreate(
                ['name' => $type['name']],
                ['color' => $type['color']]
            );
        }
    }
}
