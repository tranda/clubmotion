<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Str;

class CalendlyToSupermoveTransformer
{
    protected $projectIdentifier = 'TRAINING-2514';
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
        $moveDate = $this->getAnswerByQuestion($questionsAndAnswers, 'Move date');
        $originAddress = $this->getAnswerByQuestion($questionsAndAnswers, 'Origin Address');
        
        // Parse origin address (basic parsing, can be improved)
        $addressParts = $this->parseAddress($originAddress);
        
        // Generate a unique project identifier
        $projectIdentifier = $this->projectIdentifier;
        
        // Format date from Calendly to required format (YYYY-MM-DD)
        $formattedDate = $this->formatDate($moveDate);
        
        // Use start time from scheduled event
        $startTime = isset($payload['scheduled_event']['start_time']) 
            ? Carbon::parse($payload['scheduled_event']['start_time'])->format('Hi') 
            : '0900';
        
        // Map bedroom count to move size
        $moveSize = $bedroomCount . ' Bedroom';
        
        return [
            'id' => 'supersalesforce',
            'project' => [
                'identifier' => $projectIdentifier,
                'name' => $payload['name'] ?? 'New Move Project',
                'description' => 'Move project created from Calendly booking',
                'customer' => [
                    'first_name' => $payload['first_name'] ?? '',
                    'last_name' => $payload['last_name'] ?? '',
                    'phone_number' => $this->formatPhoneNumber($phoneNumber),
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
                        'dispatch_notes' => '',
                        'office_notes' => '',
                        'note_to_customer' => '',
                        'referral_source' => '',
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
        return preg_replace('/[^0-9]/', '', $phoneNumber);
    }
}