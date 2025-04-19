<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class CalendlyToSupermoveTransformer
{
    protected $projectIdentifierPrefix = 'TRAINING-';

    private function getNextProjectNumber()
    {
        if (!Cache::has('project_counter')) {
            // Set initial value (for example, starting from 1000)
            Cache::put('project_counter', 5000, now()->addYears(10)); // Cache for 10 years or whatever duration you prefer
        }
        // Use Laravel's atomic increment operation
        $number = Cache::increment('project_counter', 1);
        
        // If the counter wasn't set before (first run), it will be 1
        return $number;
    }
    /**
     * Transform Calendly webhook data to SuperMove API format
     *
     * @param array $calendlyData The webhook payload from Calendly
     * @return array Formatted data for SuperMove API
     */
    public function transform(array $calendlyData): array
    {
        $payload = $calendlyData['payload'] ?? [];
        $questionsAndAnswers = $payload['questions_and_answers'] ?? [];
        
        // Extract data from questions and answers
        $phoneNumber = $this->getAnswerByQuestion($questionsAndAnswers, 'Phone Number');
        $bedroomCount = $this->getAnswerByQuestion($questionsAndAnswers, 'Property size - Number of bedrooms');
        // $moveDate = $this->getAnswerByQuestion($questionsAndAnswers, 'Move date');
        $originAddress = $this->getAnswerByQuestion($questionsAndAnswers, 'Origin Address');
        $destinationAddress = $this->getAnswerByQuestion($questionsAndAnswers, 'Destination Address');
        $referralSource = $this->getAnswerByQuestion($questionsAndAnswers, 'First name and email address of the person to receive complete Video Survey and Cube Sheet - moving consultant/agent ');
        
        // Parse origin address (basic parsing, can be improved)
        $addressParts = $this->parseAddress($originAddress);
        $addressParts2 = $this->parseAddress($destinationAddress);
        
        // Generate a unique project identifier
        $projectNumber = $this->getNextProjectNumber();
        $projectIdentifier = $this->projectIdentifierPrefix . str_pad($projectNumber, 4, '0', STR_PAD_LEFT);
        
        $moveDate = $payload['scheduled_event']['end_time'];
        // Format date from Calendly to required format (YYYY-MM-DD)
        $formattedDate = $this->formatDate($moveDate);
        
        // Use start time from scheduled event
        $startTime = isset($payload['scheduled_event']['end_time']) 
            ? Carbon::parse($payload['scheduled_event']['end_time'])->format('Hi') 
            : '0900';
        
        // Map bedroom count to move size
        $moveSize = $bedroomCount . ' Bedroom';

        $dispatchNotes = $this->getAnswerByQuestion($questionsAndAnswers, 'Dispatch Notes').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Property size - Number of bedrooms').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Property size - Square footage').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Additional property units (check all that apply)').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Move date').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Origin Address').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Destination Address').'\n'.$this->getAnswerByQuestion($questionsAndAnswers, 'Additional Details');
        
        return [
            'id' => 'supersalesforce',
            'project' => [
                'identifier' => $projectIdentifier,
                'name' => $this->getAnswerByQuestion($questionsAndAnswers, 'Service Order Number (If applicable)'),
                'description' => 'Move project created from Calendly booking',
                'customer' => [
                    'first_name' => $payload['first_name'] ?? '',
                    'last_name' => $payload['last_name'] ?? '',
                    'phone_number' => $this->formatPhoneNumber($phoneNumber),
                    // 'phone_number' => '1112223333',
                    'email' => $payload['email'] ?? '',
                ],
                'jobs' => [
                    [
                        'identifier' => 'JOB-' . Str::random(5),
                        'is_primary' => true,
                        'job_type' => [
                            'identifier' => 'local-move-move', // This will be defined elsewhere as mentioned
                        ],
                        'status' => 'BOOKED',
                        'name' => 'Moving Job',
                        'move_size' => $moveSize,
                        'crew_size' => '2', // Default value as mentioned
                        'date' => $formattedDate,
                        'start_time_1' => $startTime,
                        'start_time_2' => '', // Will be updated later as mentioned
                        'additional_notes' => $this->getAnswerByQuestion($questionsAndAnswers, 'Additional Details'),
                        'dispatch_notes' => $dispatchNotes,
                        'office_notes' => '',
                        'note_to_customer' => '',
                        'referral_source' => $referralSource,
                        'referral_details' => '',
                        'locations' => [
                            [
                                'address' => $addressParts['street'] ?? $originAddress,
                                'city' => $addressParts['city'] ?? '',
                                'zip_code' => $addressParts['zip'] ?? '',
                                'latitude' => 0, // Will need to be geocoded
                                'longitude' => 0, // Will need to be geocoded
                                'unit' => '',
                                'floor_number' => 0,
                                'notes' => '',
                                'has_elevator' => false,
                                'has_long_walk' => false,
                                'stair_count' => 0,
                            ],
                            [
                                'address' => $addressParts2['street'] ?? $destinationAddress,
                                'city' => $addressParts2['city'] ?? '',
                                'zip_code' => $addressParts2['zip'] ?? '',
                                'latitude' => 0, // Will need to be geocoded
                                'longitude' => 0, // Will need to be geocoded
                                'unit' => '',
                                'floor_number' => 0,
                                'notes' => '',
                                'has_elevator' => false,
                                'has_long_walk' => false,
                                'stair_count' => 0,
                            ],
                        ],
                        'organization' => [
                            'identifier' => 'supersalesforce',
                        ],
                    ],
                ],
            ],
        ];
    }
    
    /**
     * Get answer by question from questions_and_answers array
     *
     * @param array $questionsAndAnswers
     * @param string $questionText
     * @return string|null
     */
    private function getAnswerByQuestion(array $questionsAndAnswers, string $questionText): ?string
    {
        foreach ($questionsAndAnswers as $qa) {
            if ($qa['question'] === $questionText) {
                return $qa['answer'];
            }
        }
        
        return null;
    }
    
    /**
     * Basic address parser
     * This is a simplified version and might need improvement for real-world addresses
     *
     * @param string|null $address
     * @return array
     */
    private function parseAddress(?string $address): array
    {
        if (!$address) {
            return ['street' => '', 'city' => '', 'zip' => ''];
        }
        
        // Very basic parsing - assuming format like "Street, City"
        $parts = explode(',', $address);
        
        return [
            'street' => trim($parts[0] ?? ''),
            'city' => trim($parts[1] ?? ''),
            'zip' => '', // No zip in the example data
        ];
    }
    
    /**
     * Format date to YYYY-MM-DD
     *
     * @param string|null $date
     * @return string
     */
    private function formatDate(?string $date): string
    {
        if (!$date) {
            return date('Y-m-d');
        }
        
        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            return date('Y-m-d');
        }
    }
    
    /**
     * Format phone number (remove non-numeric characters)
     *
     * @param string|null $phoneNumber
     * @return string
     */
    private function formatPhoneNumber(?string $phoneNumber): string
    {
        if (!$phoneNumber) {
            return '';
        }

        // Remove non-numeric characters
        $numbers = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Check if it's an international number
        if (strlen($numbers) > 10) {
            // If longer than 10 digits and starts with country code, take last 10 digits
            return substr($numbers, -10);
        }
        
        // Pad shorter numbers to 10 digits
        if (strlen($numbers) < 10) {
            return str_pad($numbers, 10, '0', STR_PAD_LEFT);
        }
        
        return $numbers;
    }
}