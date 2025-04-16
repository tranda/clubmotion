<?php
// PHP/Laravel Example - routes/api.php or web.php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;

class CalendlyWebhook extends Controller {
    protected $signing_key = "5mEzn9C-I28UtwOjZJtFoob0sAAFZ95GbZkqj4y3i0I";

    public function webhook(Request $request) {
        Log::info('✅ Calendly webhook endpoint hit');
        // Get the raw payload
        $payload = $request->getContent();
        
        // Log the entire payload
        Log::info('Calendly Webhook Received: ' . $payload);
        
        // Parse the JSON payload
        $data = json_decode($payload, true);
        
        $signature = $request->header('Calendly-Webhook-Signature');
        Log::info('Signature: ' . $signature);
        $signingKey = $this->signing_key; // Your signing key
        
        if (!$this->verifyCalendlySignature($payload, $signature, $signingKey)) {
            Log::warning('Invalid Calendly webhook signature');
            return response()->json(['status' => 'invalid signature'], 401);
        }
        
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
    }


    protected function verifyCalendlySignature($payload, $signature, $signingKey) {
        if (empty($payload) || empty($signature) || empty($signingKey)) {
            return false;
        }
 
        $computedSignature = hash_hmac('sha256', $payload, $signingKey);
        return hash_equals($computedSignature, $signature);
    }

}