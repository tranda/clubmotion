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
     * Accepts two URL shapes:
     *   1. Regular sheet:    /spreadsheets/d/<sheet_id>/edit?...
     *   2. Published-to-web: /spreadsheets/d/e/<publish_id>/pubhtml
     *
     * In both cases the sheet must be "Published to web" (File → Share →
     * Publish to web → Entire Document), because tab enumeration uses the
     * pubhtml endpoint which only responds for published sheets.
     */
    public function fetchAll(string $sheetUrl): array
    {
        $parsed = $this->parseUrl($sheetUrl);
        if (!$parsed) {
            throw new \RuntimeException('Could not extract sheet ID from the URL.');
        }
        [$kind, $id] = $parsed;

        $discovery = $this->discoverTabs($kind, $id);
        $tabs = $discovery['tabs'];

        if (empty($tabs)) {
            $diag = $discovery['diagnostic'] ?? '(no diagnostic)';
            throw new \RuntimeException(
                'Could not discover tabs. ' . $diag . ' '
                . 'If the sheet is not yet published, do File → Share → '
                . 'Publish to web → Entire Document. Make sure to paste the '
                . 'URL Google gives you (it ends in /pubhtml).'
            );
        }

        $results = [];
        foreach ($tabs as $tab) {
            $csv = $this->fetchCsv($kind, $id, $tab['gid']);
            $results[] = [
                'gid' => $tab['gid'],
                'label' => $tab['label'],
                'csv' => $csv,
            ];
        }
        return $results;
    }

    /**
     * Returns ['published', $publishId] for /d/e/<publish_id>/... URLs,
     * or ['regular', $sheetId] for /d/<sheet_id>/... URLs, or null.
     */
    private function parseUrl(string $url): ?array
    {
        if (preg_match('#/spreadsheets/d/e/([a-zA-Z0-9_\-]+)#', $url, $m)) {
            return ['published', $m[1]];
        }
        if (preg_match('#/spreadsheets/d/([a-zA-Z0-9_\-]+)#', $url, $m)) {
            return ['regular', $m[1]];
        }
        return null;
    }

    private function pubhtmlUrl(string $kind, string $id): string
    {
        return $kind === 'published'
            ? "https://docs.google.com/spreadsheets/d/e/{$id}/pubhtml"
            : "https://docs.google.com/spreadsheets/d/{$id}/pubhtml";
    }

    private function csvEndpoints(string $kind, string $id, string $gid): array
    {
        if ($kind === 'published') {
            // Published sheets: /pub is the canonical CSV endpoint and works
            // for any published gid; the others fall back as best-effort.
            return [
                "https://docs.google.com/spreadsheets/d/e/{$id}/pub?gid={$gid}&single=true&output=csv",
                "https://docs.google.com/spreadsheets/d/e/{$id}/pub?output=csv&gid={$gid}",
            ];
        }

        return [
            "https://docs.google.com/spreadsheets/d/{$id}/export?format=csv&gid={$gid}",
            "https://docs.google.com/spreadsheets/d/{$id}/gviz/tq?tqx=out:csv&gid={$gid}",
            "https://docs.google.com/spreadsheets/d/{$id}/pub?output=csv&gid={$gid}",
        ];
    }

    private function discoverTabs(string $kind, string $id): array
    {
        $url = $this->pubhtmlUrl($kind, $id);
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
        // Reject the generic Google marketing landing page.
        if (stripos($html, 'sheet-button') === false && stripos($html, 'sheetmenu') === false && stripos($html, 'gid=') === false) {
            return [];
        }

        $tabs = [];

        // Pattern A: <li id="sheet-button-<gid>" ...>Label</li>  (regular pubhtml)
        if (preg_match_all('/id=["\']sheet-button-(\d+)["\'][^>]*>([^<]+)</', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $tabs[] = [
                    'gid' => $m[1],
                    'label' => trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5)),
                ];
            }
        }

        // Pattern B: <a class="..." href="...?gid=<gid>...">Label</a>  (published menu)
        if (empty($tabs) && preg_match_all('/href=["\'][^"\']*gid=(\d+)[^"\']*["\'][^>]*>([^<]+)</', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $label = trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5));
                if ($label === '' || stripos($label, '<') !== false) continue;
                $tabs[] = ['gid' => $m[1], 'label' => $label];
            }
        }

        // Pattern C: data-id="<gid>" ... >Label<
        if (empty($tabs) && preg_match_all('/data-id=["\'](\d+)["\'][^>]*>([^<]+)</', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $tabs[] = [
                    'gid' => $m[1],
                    'label' => trim(html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5)),
                ];
            }
        }

        // Deduplicate by gid, keep first (preserves tab order).
        $seen = [];
        $unique = [];
        foreach ($tabs as $t) {
            if (isset($seen[$t['gid']])) continue;
            $seen[$t['gid']] = true;
            $unique[] = $t;
        }
        return $unique;
    }

    private function fetchCsv(string $kind, string $id, string $gid): string
    {
        $endpoints = $this->csvEndpoints($kind, $id, $gid);

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
            return $body;
        }

        throw new \RuntimeException(
            "Could not fetch CSV for tab gid={$gid}. Last error: {$lastError}. "
            . "The sheet must be Published to web (File → Share → Publish to web → Entire Document)."
        );
    }
}
