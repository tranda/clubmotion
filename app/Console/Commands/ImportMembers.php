<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Member;
use League\Csv\Reader;
use Illuminate\Support\Facades\Log;

class ImportMembers extends Command
{
    protected $signature = 'import:members {filepath}';
    protected $description = 'Import members from a CSV file';

    public function handle()
    {
        $filePath = $this->argument('filepath');

        if (!file_exists($filePath)) {
            $this->error("File not found: $filePath");
            return;
        }

        $csv = Reader::createFromPath($filePath, 'r');
        $csv->setHeaderOffset(0); // Use first row as header

        foreach ($csv as $record) {
            try {
                Member::updateOrCreate(
                    ['membership_number' => $record['membership_number']], // Matching condition
                    [
                        'name' => $record['name'],
                        'email' => $record['email'],
                        'date_of_birth' => $record['date_of_birth'],
                        'medical_validity' => $record['medical_validity'],
                        //'category_id' => $record['category_id'],
                    ]
                );
            } catch (\Exception $e) {
                Log::error("Failed to import member: " . $e->getMessage());
            }
        }

        $this->info('CSV import completed!');
    }
}
