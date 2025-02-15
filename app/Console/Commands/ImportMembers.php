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
        //test insert
        Member::create([
            'name' => 'John Doe',
            'membership_number' => '12345',
            'email' => 'john.doe@example.com',
            // other fields
        ]);
        
        $filePath = $this->argument('filepath');

        if (!file_exists($filePath)) {
            $this->error("File not found: $filePath");
            return;
        }

        $csv = Reader::createFromPath($filePath, 'r');
        $csv->setHeaderOffset(0); // Use first row as header

        foreach ($csv as $record) {
            try {
                Member::create([
                    'name' => $record['name'],
                    'membership_number' => $record['membership_number'],
                    'email' => $record['email'],
                    'category_id' => $record['category_id'],
                ]);
            } catch (\Exception $e) {
                Log::error("Failed to import member: " . $e->getMessage());
            }
        }

        $this->info('CSV import completed!');
    }
}
