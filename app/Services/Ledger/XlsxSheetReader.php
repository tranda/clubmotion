<?php

namespace App\Services\Ledger;

use PhpOffice\PhpSpreadsheet\IOFactory;

class XlsxSheetReader
{
    /**
     * Read an uploaded XLSX/ODS file and return an array shaped the same as
     * GoogleSheetCsvFetcher::fetchAll() so the rest of the import pipeline
     * stays unchanged:
     *
     *   [
     *     ['gid' => '0', 'label' => 'januar 2026', 'csv' => "<csv>"],
     *     ['gid' => '1', 'label' => 'februar 2026', 'csv' => "<csv>"],
     *     ...
     *   ]
     *
     * "gid" is just the sheet index here — the CSV parser doesn't care
     * what the value is, it's only used for traceability in staging.
     */
    public function read(string $filePath): array
    {
        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $reader->setReadEmptyCells(false);
        $spreadsheet = $reader->load($filePath);

        $results = [];
        $idx = 0;
        foreach ($spreadsheet->getSheetNames() as $sheetName) {
            $sheet = $spreadsheet->getSheetByName($sheetName);
            if (!$sheet) continue;

            $rows = $sheet->toArray(null, true, true, false);
            $csv = $this->arrayToCsv($rows);

            $results[] = [
                'gid' => (string) $idx,
                'label' => $sheetName,
                'csv' => $csv,
            ];
            $idx++;
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $results;
    }

    private function arrayToCsv(array $rows): string
    {
        $stream = fopen('php://memory', 'r+');
        foreach ($rows as $row) {
            $cells = array_map(function ($v) {
                if ($v === null) return '';
                if ($v instanceof \DateTimeInterface) return $v->format('Y-m-d');
                return (string) $v;
            }, $row);
            fputcsv($stream, $cells);
        }
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        return $csv;
    }
}
