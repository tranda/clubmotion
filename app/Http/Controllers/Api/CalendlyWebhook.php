<?php
// PHP/Laravel Example - routes/api.php or web.php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

use App\Services\CalendlyToSupermoveTransformer;

class CalendlyWebhook extends Controller {
    protected $signing_key = "5mEzn9C-I28UtwOjZJtFoob0sAAFZ95GbZkqj4y3i0I";

    protected $transformer;
    
    public function __construct(CalendlyToSupermoveTransformer $transformer)
    {
        $this->transformer = $transformer;
    }
    
    public function handleWebhook(Request $request)
    {
        // Validate the webhook (you might want to add Calendly signature verification)
        $calendlyData = $request->all();

        // Transform data to SuperMove format
        $supermoveData = $this->transformer->transform($calendlyData);
        Log::info('Transformed payload: ', $supermoveData);

        // Send data to SuperMove API
        // $response = Http::post('https://api.supermove.co/v1/projects/sync', $supermoveData);
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.supermove.api_key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.supermove.co/v1/projects/sync', $supermoveData);

        Log::info('SuperMove API response: ', $response->json());
        if ($response->failed()) {
            Log::error('Failed to send data to SuperMove API', ['response' => $response->body()]);
            return response()->json(['status' => 'error', 'message' => 'Failed to send data'], 500);
        }

        return response()->json(['status' => 'success']);
    }



    public function webhook(Request $request) {
        Log::info('✅ Calendly webhook endpoint hit');
        // Get the raw payload
        $payload = $request->getContent();
        
        // Log the entire payload
        Log::info('Calendly Webhook Received: ' . $payload);
        
        // Parse the JSON payload
        $data = json_decode($payload, true);
        
        if ($request["noSignature"] == "true") {
            Log::info('No signature check, skipping verification');
        } else {
            $signature = $request->header('Calendly-Webhook-Signature');
            Log::info('Signature: ' . $signature);
            $signingKey = $this->signing_key; // Your signing key
            
            if (!$this->verifyCalendlySignature($payload, $signature, $signingKey)) {
                Log::warning('Invalid Calendly webhook signature');
                return response()->json(['status' => 'invalid signature'], 401);
            }
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
 
        $components = [];
        foreach (explode(',', $signature) as $component) {
            if (strpos($component, '=') !== false) {
                list($key, $value) = explode('=', $component, 2);
                $components[$key] = $value;
            }
        }
        
        // Check if we have the required components
        if (!isset($components['t']) || !isset($components['v1'])) {
            return false;
        }
        
        $timestamp = $components['t'];
        $signature = $components['v1'];
        
        // Optional: Check if the timestamp is recent (within 5 minutes)
        $maxAge = 5 * 60; // 5 minutes in seconds
        if (time() - intval($timestamp) > $maxAge) {
            Log::warning('Webhook timestamp too old');
            return false;
        }
        
        // Calculate the expected signature
        // For debugging, try both methods and log them
        $computedSignature1 = hash_hmac('sha256', $payload, $signingKey);
        $computedSignature2 = hash_hmac('sha256', $timestamp . '.' . $payload, $signingKey);
        
        Log::info('Received signature: ' . $signature);
        Log::info('Computed signature (payload only): ' . $computedSignature1);
        Log::info('Computed signature (timestamp.payload): ' . $computedSignature2);
        
        // Compare both possible signatures
        return hash_equals($computedSignature1, $signature) || 
               hash_equals($computedSignature2, $signature);
    }

}