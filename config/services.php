<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'dbcrews' => [
        'base_url' => env('DBCREWS_BASE_URL', 'https://dbcrews.motion.rs/api/public'),
        // Required now (feeds are key-protected). Sent as the X-Api-Key header.
        // Falls back to the older DBCREWS_RESULTS_KEY name if that's what's set.
        'key' => env('DBCREWS_API_KEY', env('DBCREWS_RESULTS_KEY')),
    ],

    // OneSignal Web Push. App ID is public (used by the browser SDK); the REST
    // API key is secret (server-side only). Both set in .env on the host.
    'onesignal' => [
        'app_id' => env('ONESIGNAL_APP_ID'),
        'rest_api_key' => env('ONESIGNAL_REST_API_KEY'),
    ],

];
