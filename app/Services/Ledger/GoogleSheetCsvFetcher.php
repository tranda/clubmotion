<?php

namespace App\Services\Ledger;

use Illuminate\Support\Facades\Http;

class GoogleSheetCsvFetcher
{
    /**
     * Given a Google Sheets URL, return all tabs as
     * [['gid' => '...', 'label' => '...', 'csv' => '...'], ...].
     *
     * Strategy:
     *   1. Extract sheet ID from the URL.
     *   2. Fetch /pubhtml to discover gid + label for every tab.
     *      Falls back to a single-tab fetch using gid from the URL if /pubhtml
     *      is unavailable.
     *   3. For each tab, GET /export?format=csv&gid=<gid>.
     *   4. Reject any response that looks like an HTML login page.
     *
     * Throws \RuntimeException with a human-readable message on failure.
     */
    public function fetchAll(string $sheetUrl): array
    {
        $sheetId = $this->extractSheetId($sheetUrl);
        if (!$sheetId) {
            throw new \RuntimeException('Could not extract sheet ID from URL.');
        }

        $tabs = $this->discoverTabs($sheetId);

        if (empty($tabs)) {
            // Fall back to the gid in the original URL, if any.
            $gid = $this->extractGid($sheetUrl) ?? '0';
            $tabs = [['gid' => $gid, 'label' => 'Sheet1']];
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
        $response = Http::timeout(10)->withOptions(['allow_redirects' => true])->get($url);
        if (!$response->successful()) {
            return [];
        }
        $html = $response->body();
        if ($html === '' || stripos($html, '<html') === false) {
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
        $url = "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&gid={$gid}";
        $response = Http::timeout(15)
            ->retry(2, 500)
            ->withOptions(['allow_redirects' => true])
            ->get($url);

        if ($response->status() === 401 || $response->status() === 403) {
            throw new \RuntimeException('Sheet is not publicly accessible. Set sharing to "Anyone with the link — Viewer".');
        }
        if (!$response->successful()) {
            throw new \RuntimeException("Failed to fetch tab gid={$gid}: HTTP {$response->status()}");
        }

        $body = $response->body();
        if (str_starts_with(ltrim($body), '<!DOCTYPE') || str_starts_with(ltrim($body), '<html')) {
            throw new \RuntimeException('Received an HTML page instead of CSV. The sheet may be restricted.');
        }
        return $body;
    }
}
