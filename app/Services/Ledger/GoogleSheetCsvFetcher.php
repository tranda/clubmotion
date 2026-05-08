<?php

namespace App\Services\Ledger;

use Illuminate\Support\Facades\Http;

class GoogleSheetCsvFetcher
{
    private const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

    /**
     * Given a Google Sheets URL, return all tabs as
     * [['gid' => '...', 'label' => '...', 'csv' => '...'], ...].
     *
     * The sheet must be "Published to web" (File → Share → Publish to web)
     * — plain "Anyone with the link" sharing is not enough because /pubhtml,
     * which is needed to enumerate tabs, only responds for published sheets.
     */
    public function fetchAll(string $sheetUrl): array
    {
        $sheetId = $this->extractSheetId($sheetUrl);
        if (!$sheetId) {
            throw new \RuntimeException('Could not extract sheet ID from the URL.');
        }

        $tabs = $this->discoverTabs($sheetId);

        if (empty($tabs)) {
            throw new \RuntimeException(
                'Could not discover tabs. The sheet must be Published to web '
                . '(File → Share → Publish to web → Entire Document). Plain '
                . '"Anyone with the link" sharing is not enough.'
            );
        }

        $results = [];
        foreach ($tabs as $tab) {
            $csv = $this->fetchCsv($sheetId, $tab['gid']);
            $results[] = [
                'gid' => $tab['gid'],
                'label' => $tab['label'],
                'csv' => $csv,
            ];
        }
        return $results;
    }

    private function extractSheetId(string $url): ?string
    {
        if (preg_match('#/spreadsheets/d/([a-zA-Z0-9_\-]+)#', $url, $m)) {
            return $m[1];
        }
        return null;
    }

    private function extractGid(string $url): ?string
    {
        if (preg_match('/[?#&]gid=(\d+)/', $url, $m)) {
            return $m[1];
        }
        return null;
    }

    private function discoverTabs(string $sheetId): array
    {
        $url = "https://docs.google.com/spreadsheets/d/{$sheetId}/pubhtml";
        $response = Http::timeout(10)
            ->withHeaders([
                'User-Agent' => self::USER_AGENT,
                'Accept' => 'text/html,application/xhtml+xml',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])
            ->withOptions(['allow_redirects' => true])
            ->get($url);
        if (!$response->successful()) {
            return [];
        }
        $html = $response->body();
        if ($html === '' || stripos($html, '<html') === false) {
            return [];
        }
        // The Google marketing landing page also begins with <html — detect
        // and reject anything that doesn't look like a published-sheet index.
        if (stripos($html, 'sheet-button') === false && stripos($html, 'spreadsheet') === false) {
            return [];
        }

        // The /pubhtml page lists tabs in a select#sheet-menu with options
        // whose id is "sheet-button-<gid>" and whose text content is the label.
        // Format may evolve, so fall back on a few patterns.
        $tabs = [];

        if (preg_match_all('/id="sheet-button-(\d+)"[^>]*>([^<]+)</', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $tabs[] = ['gid' => $m[1], 'label' => trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5))];
            }
        }

        if (empty($tabs) && preg_match_all('/data-id=["\'](\d+)["\'][^>]*>([^<]+)</', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $tabs[] = ['gid' => $m[1], 'label' => trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5))];
            }
        }

        // Deduplicate by gid.
        $seen = [];
        $unique = [];
        foreach ($tabs as $t) {
            if (isset($seen[$t['gid']])) continue;
            $seen[$t['gid']] = true;
            $unique[] = $t;
        }
        return $unique;
    }

    private function fetchCsv(string $sheetId, string $gid): string
    {
        $endpoints = [
            "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&gid={$gid}",
            "https://docs.google.com/spreadsheets/d/{$sheetId}/gviz/tq?tqx=out:csv&gid={$gid}",
            "https://docs.google.com/spreadsheets/d/{$sheetId}/pub?output=csv&gid={$gid}",
        ];

        $lastError = null;
        foreach ($endpoints as $url) {
            try {
                $response = Http::timeout(15)
                    ->retry(2, 500, null, false)
                    ->withHeaders([
                        'User-Agent' => self::USER_AGENT,
                        'Accept' => 'text/csv,application/csv,text/plain;q=0.9,*/*;q=0.5',
                        'Accept-Language' => 'en-US,en;q=0.9',
                    ])
                    ->withOptions(['allow_redirects' => true])
                    ->get($url);
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                continue;
            }

            if ($response->status() === 401 || $response->status() === 403) {
                throw new \RuntimeException('Sheet is not publicly accessible. Set sharing to "Anyone with the link — Viewer" and Publish to web.');
            }
            if (!$response->successful()) {
                $lastError = "HTTP {$response->status()} from {$url}";
                continue;
            }

            $body = $response->body();
            $trimmed = ltrim($body);
            if (str_starts_with($trimmed, '<!DOCTYPE') || str_starts_with($trimmed, '<html')) {
                $lastError = "HTML response from {$url} (likely the marketing/login page)";
                continue;
            }
            // gviz wraps CSV in some cases; accept any non-HTML body as CSV.
            return $body;
        }

        throw new \RuntimeException(
            "Could not fetch CSV for tab gid={$gid}. Last error: {$lastError}. "
            . "The sheet must be Published to web (File → Share → Publish to web → Entire Document)."
        );
    }
}
