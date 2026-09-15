<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin wrapper around the OneSignal REST API for sending web push
 * notifications. Delivery is a plain outbound HTTPS call (works on shared
 * hosting with the sync queue). All methods swallow errors and log them so a
 * failed push never breaks the calling request (e.g. the public join form).
 */
class OneSignalPush
{
    private const API_URL = 'https://api.onesignal.com/notifications';

    /**
     * Are the OneSignal credentials configured?
     */
    public static function isConfigured(): bool
    {
        return filled(config('services.onesignal.app_id'))
            && filled(config('services.onesignal.rest_api_key'));
    }

    /**
     * Send to every subscriber carrying a given data tag
     * (e.g. staff = "1" for admins/superusers).
     *
     * @return bool True if the request was accepted by OneSignal.
     */
    public function toTag(string $key, string $value, string $title, string $message, ?string $url = null): bool
    {
        return $this->send([
            'filters' => [
                ['field' => 'tag', 'key' => $key, 'relation' => '=', 'value' => $value],
            ],
        ], $title, $message, $url);
    }

    /**
     * Send to specific users by their OneSignal external id (we use the
     * Laravel user id). Handy for per-member notifications later.
     *
     * @param array<int|string> $externalIds
     */
    public function toExternalIds(array $externalIds, string $title, string $message, ?string $url = null): bool
    {
        $ids = array_values(array_map('strval', array_filter($externalIds, fn ($id) => $id !== null && $id !== '')));

        if (empty($ids)) {
            return false;
        }

        return $this->send([
            'include_aliases' => ['external_id' => $ids],
            'target_channel' => 'push',
        ], $title, $message, $url);
    }

    /**
     * Perform the actual POST, merging the audience selector with the payload.
     *
     * @param array<string, mixed> $audience
     */
    private function send(array $audience, string $title, string $message, ?string $url = null): bool
    {
        if (! self::isConfigured()) {
            Log::warning('OneSignalPush: skipped, credentials not configured.');

            return false;
        }

        $payload = array_merge($audience, [
            'app_id' => config('services.onesignal.app_id'),
            'headings' => ['en' => $title],
            'contents' => ['en' => $message],
        ]);

        if ($url) {
            $payload['url'] = $url;
        }

        try {
            $response = Http::withToken(config('services.onesignal.rest_api_key'), 'Key')
                ->acceptJson()
                ->asJson()
                ->timeout(10)
                ->post(self::API_URL, $payload);

            if ($response->failed()) {
                Log::warning('OneSignalPush: send failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('OneSignalPush: exception during send', ['message' => $e->getMessage()]);

            return false;
        }
    }
}
