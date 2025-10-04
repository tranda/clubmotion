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
            ['name' => 'Competition', 'color' => '#10B981'], // Green
            ['name' => 'Other', 'color' => '#F59E0B'], // Orange
        ];

        foreach ($sessionTypes as $type) {
            SessionType::firstOrCreate(
                ['name' => $type['name']],
                ['color' => $type['color']]
            );
        }
    }
}
