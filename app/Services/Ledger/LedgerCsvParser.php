<?php

namespace App\Services\Ledger;

class LedgerCsvParser
{
    private const BUCKET_COLS = ['cash', 'bank', 'eur'];
    private const SERBIAN_MONTHS = [
        'jan' => 1, 'januar' => 1,
        'feb' => 2, 'februar' => 2,
        'mar' => 3, 'mart' => 3,
        'apr' => 4, 'april' => 4,
        'maj' => 5, 'may' => 5,
        'jun' => 6, 'juni' => 6, 'june' => 6,
        'jul' => 7, 'juli' => 7, 'july' => 7,
        'avg' => 8, 'avgust' => 8, 'aug' => 8, 'august' => 8,
        'sep' => 9, 'septembar' => 9,
        'okt' => 10, 'oktobar' => 10, 'oct' => 10,
        'nov' => 11, 'novembar' => 11,
        'dec' => 12, 'decembar' => 12,
    ];

    /**
     * Parse one tab's CSV into normalized rows.
     *
     * Returns an array containing:
     *   - 'gid'   (passed through by caller)
     *   - 'label' (passed through by caller)
     *   - 'year'  (resolved from tab label or fallback)
     *   - 'rows'  (parsed entry rows)
     *   - 'opening_balances' (per-bucket opening seed if found in the header row)
     *
     * For convenience, this method returns just the rows array (with extra
     * metadata attached on the parser-side via $tabInfo). The caller already
     * has gid+label and passes them in; this method returns rows array only.
     *
     * Each parsed row:
     *   ['date'=>'YYYY-MM-DD', 'type'=>'income|expense', 'bucket'=>'cash|bank|eur',
     *    'amount'=>float, 'description'=>string, 'raw'=>array, 'error'=>?string]
     */
    public function parseTab(string $csv, string $tabLabel, int $defaultYear): array
    {
        $year = $this->yearFromLabel($tabLabel, $defaultYear);
        $rows = $this->readCsvRows($csv);

        $headerInfo = $this->locateHeader($rows);
        if (!$headerInfo) {
            return [];
        }

        $headerIdx = $headerInfo['index'];
        $cols = $headerInfo['columns'];

        $entries = [];
        for ($i = $headerIdx + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $parsed = $this->parseRow($row, $cols, $year);
            if ($parsed !== null) {
                $parsed['raw'] = $row;
                $entries[] = $parsed;
            }
        }

        return $entries;
    }

    /**
     * Detect opening balances from the first non-header row that has the
     * label "u kasi" in the income-description column. Returns ['cash'=>X,'bank'=>Y,'eur'=>Z]
     * or empty if not found. Caller passes these to PaymentSetting.
     */
    public function detectOpeningBalances(string $csv): array
    {
        $rows = $this->readCsvRows($csv);
        $headerInfo = $this->locateHeader($rows);
        if (!$headerInfo) return [];
        $cols = $headerInfo['columns'];

        for ($i = $headerInfo['index'] + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $descIdx = $cols['income_description'] ?? 1;
            $desc = $this->normalizeText($row[$descIdx] ?? '');
            if ($desc === 'u kasi') {
                $out = [];
                foreach (self::BUCKET_COLS as $bucket) {
                    $colIdx = $cols['income_' . $bucket] ?? null;
                    if ($colIdx !== null) {
                        $val = $this->parseDecimal($row[$colIdx] ?? '');
                        $out[$bucket] = $val;
                    }
                }
                return $out;
            }
            // Stop after first data row.
            break;
        }
        return [];
    }

    private function readCsvRows(string $csv): array
    {
        $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv); // strip BOM
        $rows = [];
        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $csv);
        rewind($stream);
        while (($row = fgetcsv($stream)) !== false) {
            $rows[] = $row;
        }
        fclose($stream);
        return $rows;
    }

    /**
     * Find the row that contains "datum" + "prihodi" + "rashodi" tokens.
     * Build a column-name → index map.
     *
     * Sheet shape (observed):
     *   col0: datum
     *   col1: prihodi          (income description / payer)
     *   col2,3,4: keš/račun/evri (income amounts)
     *   col5: blank
     *   col6: rashodi          (expense description)
     *   col7,8,9: keš/račun/evri (expense amounts)
     *   col10: blank
     *   col11..: u kasi running balances (ignored on import)
     */
    private function locateHeader(array $rows): ?array
    {
        foreach ($rows as $idx => $row) {
            $cells = array_map(fn ($c) => $this->normalizeText((string) $c), $row);
            $hasDatum = in_array('datum', $cells, true);
            $hasPrihodi = in_array('prihodi', $cells, true);
            $hasRashodi = in_array('rashodi', $cells, true);
            if ($hasDatum && $hasPrihodi && $hasRashodi) {
                return ['index' => $idx, 'columns' => $this->mapColumns($cells)];
            }
        }
        return null;
    }

    private function mapColumns(array $cells): array
    {
        $cols = [];
        foreach ($cells as $idx => $cell) {
            if ($cell === 'datum' && !isset($cols['date'])) {
                $cols['date'] = $idx;
            } elseif ($cell === 'prihodi' && !isset($cols['income_description'])) {
                $cols['income_description'] = $idx;
            } elseif ($cell === 'rashodi' && !isset($cols['expense_description'])) {
                $cols['expense_description'] = $idx;
            }
        }

        // Bucket columns are positional after the description marker, in
        // order: cash, bank, eur.
        if (isset($cols['income_description'])) {
            $cols['income_cash'] = $cols['income_description'] + 1;
            $cols['income_bank'] = $cols['income_description'] + 2;
            $cols['income_eur'] = $cols['income_description'] + 3;
        }
        if (isset($cols['expense_description'])) {
            $cols['expense_cash'] = $cols['expense_description'] + 1;
            $cols['expense_bank'] = $cols['expense_description'] + 2;
            $cols['expense_eur'] = $cols['expense_description'] + 3;
        }
        return $cols;
    }

    private function parseRow(array $row, array $cols, int $year): ?array
    {
        $dateRaw = $row[$cols['date'] ?? 0] ?? '';
        $date = $this->parseDate($dateRaw, $year);

        // Description always lives in the "prihodi" (income-description)
        // column — the "rashodi" header at col 6 only labels the expense
        // AMOUNT columns; expense rows still put their description in col 1.
        $description = trim((string) ($row[$cols['income_description'] ?? 1] ?? ''));

        $incomeAmounts = [
            'cash' => $this->parseDecimal($row[$cols['income_cash'] ?? 2] ?? ''),
            'bank' => $this->parseDecimal($row[$cols['income_bank'] ?? 3] ?? ''),
            'eur'  => $this->parseDecimal($row[$cols['income_eur']  ?? 4] ?? ''),
        ];
        $expenseAmounts = [
            'cash' => $this->parseDecimal($row[$cols['expense_cash'] ?? 7] ?? ''),
            'bank' => $this->parseDecimal($row[$cols['expense_bank'] ?? 8] ?? ''),
            'eur'  => $this->parseDecimal($row[$cols['expense_eur']  ?? 9] ?? ''),
        ];

        $incomeNonZero = array_filter($incomeAmounts, fn ($v) => $v !== null && $v > 0);
        $expenseNonZero = array_filter($expenseAmounts, fn ($v) => $v !== null && $v > 0);

        // Skip empty / running-balance / summary rows.
        if (empty($incomeNonZero) && empty($expenseNonZero)) {
            return null;
        }

        // "u kasi" row at top of sheet — opening balance, handled separately.
        if ($this->normalizeText($description) === 'u kasi') {
            return null;
        }

        // Ignore obvious summary keywords.
        $normDesc = $this->normalizeText($description);
        $skipKeywords = ['prihodi ukupno', 'rashodi ukupno', 'kusur', 'ukupno'];
        foreach ($skipKeywords as $kw) {
            if (str_contains($normDesc, $kw)) return null;
        }

        if (!empty($incomeNonZero) && !empty($expenseNonZero)) {
            // Per spec, never both — return income as the canonical row and
            // log expense as error so admin sees it in staging.
            $bucket = array_key_first($incomeNonZero);
            return [
                'date' => $date,
                'type' => 'income',
                'bucket' => $bucket,
                'amount' => $incomeNonZero[$bucket],
                'description' => $description,
                'error' => 'Row contained both income and expense amounts; imported as income.',
            ];
        }

        if (!empty($incomeNonZero)) {
            $bucket = array_key_first($incomeNonZero);
            return [
                'date' => $date,
                'type' => 'income',
                'bucket' => $bucket,
                'amount' => $incomeNonZero[$bucket],
                'description' => $description,
                'error' => $date ? null : 'Could not parse date.',
            ];
        }

        $bucket = array_key_first($expenseNonZero);
        return [
            'date' => $date,
            'type' => 'expense',
            'bucket' => $bucket,
            'amount' => $expenseNonZero[$bucket],
            'description' => $description,
            'error' => $date ? null : 'Could not parse date.',
        ];
    }

    /**
     * Parse a sheet date cell. Accepts dd.mm. (with year fallback), dd.mm.yyyy,
     * dd/mm/yyyy, yyyy-mm-dd. Returns 'Y-m-d' or null.
     */
    private function parseDate(string $value, int $fallbackYear): ?string
    {
        $v = trim($value);
        if ($v === '') return null;
        $v = rtrim($v, '.');

        // dd.mm.yyyy
        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $v, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }
        // dd.mm
        if (preg_match('/^(\d{1,2})\.(\d{1,2})$/', $v, $m)) {
            return sprintf('%04d-%02d-%02d', $fallbackYear, $m[2], $m[1]);
        }
        // dd/mm/yyyy
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $v, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }
        // yyyy-mm-dd
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $v, $m)) {
            return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
        }
        return null;
    }

    /**
     * Parse a numeric cell with Serbian-style locale tolerated:
     *   "65.350,00" → 65350.00
     *   "1,286"     → 1286.00 (no decimal separator if no '.' present)
     *   "3000"      → 3000.00
     * Returns null for empty/non-numeric.
     */
    private function parseDecimal($value): ?float
    {
        if ($value === null) return null;
        $v = trim((string) $value);
        if ($v === '') return null;

        $hasComma = str_contains($v, ',');
        $hasDot = str_contains($v, '.');

        if ($hasComma && $hasDot) {
            // Both present: assume '.' is thousands, ',' is decimal.
            $v = str_replace('.', '', $v);
            $v = str_replace(',', '.', $v);
        } elseif ($hasComma && !$hasDot) {
            // Comma only — could be thousands ("1,286") or decimal ("3,50").
            // Heuristic: if there are exactly 3 digits after the comma, treat as thousands.
            if (preg_match('/^\d{1,3}(?:,\d{3})+$/', $v)) {
                $v = str_replace(',', '', $v);
            } else {
                $v = str_replace(',', '.', $v);
            }
        } elseif (!$hasComma && $hasDot) {
            // Dot only — could be thousands ("65.350") or decimal ("65.35").
            if (preg_match('/^\d{1,3}(?:\.\d{3})+$/', $v)) {
                $v = str_replace('.', '', $v);
            }
        }

        if (!is_numeric($v)) return null;
        return round((float) $v, 2);
    }

    private function normalizeText(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/\s+/u', ' ', $value);
        return $value;
    }

    private function yearFromLabel(string $label, int $fallback): int
    {
        if (preg_match('/(\d{4})/', $label, $m)) {
            $y = (int) $m[1];
            if ($y >= 2000 && $y <= 2100) return $y;
        }
        return $fallback;
    }
}
