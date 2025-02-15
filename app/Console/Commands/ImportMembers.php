<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Member;
use League\Csv\Reader;
use App\Models\MembershipCategory;
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
                $dateOfBirth = !empty($record['date_of_birth']) ? $record['date_of_birth'] : null;
                $medicalValidity = !empty($record['medical_validity']) ? $record['medical_validity'] : null;
                $category = MembershipCategory::where('category_name', $record['category_name'])->first();
                $categoryId = $category ? $category->category_id : null;

                Member::updateOrCreate(
                    ['membership_number' => $record['membership_number']], // Matching condition
                    [
                        'name' => $record['name'],
                        'email' => $record['email'],
                        'date_of_birth' => $dateOfBirth,
                        'medical_validity' => $medicalValidity,
                        'category_id' => $categoryId,
                        'address' => $record['address'],
                        'phone' => $record['phone'],
                    ]
                );
            } catch (\Exception $e) {
                Log::error("Failed to import member: " . $e->getMessage());
            }
        }

        $this->info('CSV import completed!');
    }
}
