<?php
// PHP/Laravel Example - routes/api.php or web.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;

Route::post('/calendly-webhook', function (Request $request) {
    // Get the raw payload
    $payload = $request->getContent();
    
    // Log the entire payload
    Log::info('Calendly Webhook Received: ' . $payload);
    
    // Parse the JSON payload
    $data = json_decode($payload, true);
    
    // Optional: Verify the signature if you've enabled it
    // See the verification section below
    
    // Print details to your server log
    Log::info('Event Type: ' . $data['event']);
    
    if ($data['event'] === 'invitee.created') {
        Log::info('New booking: ' . $data['payload']['name']);
        Log::info('Email: ' . $data['payload']['email']);
        
        // Log any custom questions/answers
        if (isset($data['payload']['questions_and_answers'])) {
            foreach ($data['payload']['questions_and_answers'] as $qa) {
                Log::info('Q: ' . $qa['question'] . ', A: ' . $qa['answer']);
            }
        }
    }
    
    // Always return a 200 response quickly
    return response()->json(['status' => 'success']);
});

// Optional: Signature verification function
function verifyCalendlySignature($payload, $signature, $signingKey) {
    $computedSignature = hash_hmac('sha256', $payload, $signingKey);
    return hash_equals($computedSignature, $signature);
}