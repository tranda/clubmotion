<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class CalendlyToSupermoveTransformer
{
    protected $projectIdentifierPrefix = '';

    private function getNextProjectNumber()
    {
        if (!Cache::has('project_counter')) {
            Cache::put('project_counter', 5000, now()->addYears(10));
        }
        $number = Cache::increment('project_counter', 1);
        
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
        
        $phoneNumber = $this->getAnswerByPosition($questionsAndAnswers, 1); //'Phone Number');
        $bedroomCount = $this->getAnswerByPosition($questionsAndAnswers, 3); //'Property size - Number of bedrooms');
        $originAddress = $this->getAnswerByPosition($questionsAndAnswers, 7); //'Origin Address');
        $destinationAddress = $this->getAnswerByPosition($questionsAndAnswers, 8); //'Destination Address');
        
        $referralSource = $this->getAnswerByPosition($questionsAndAnswers, 2); //'First name and email address of the person to receive complete Video Survey and Cube Sheet - moving consultant/agent ');
        
        $addressParts = $this->parseAddress($originAddress);
        $addressParts2 = $this->parseAddress($destinationAddress);
        
        $projectNumber = $this->getNextProjectNumber();
        $projectIdentifier = $this->projectIdentifierPrefix . str_pad($projectNumber, 4, '0', STR_PAD_LEFT);
        
        $moveDate = $payload['scheduled_event']['end_time'];
        // Format date from Calendly to required format (YYYY-MM-DD)
        $formattedDate = $this->formatDate($moveDate);
        
        // Use start time from scheduled event
        $startTime = isset($payload['scheduled_event']['end_time']) 
            ? Carbon::parse($payload['scheduled_event']['end_time'])->format('Hi') 
            : '0900';
        
        $moveSize = $bedroomCount . ' Bedroom';

        $formattedPhoneNumber = $this->formatPhoneNumber($phoneNumber);
        $USphoneNumber = $formattedPhoneNumber;
        if (strlen($formattedPhoneNumber) != 10) {
            $USphoneNumber = '';
        }

        $dispatchNotes = '';
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 3).': '.$this->getAnswerByPosition($questionsAndAnswers, 3).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 4).': '.$this->getAnswerByPosition($questionsAndAnswers, 4).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 5).': '.$this->getAnswerByPosition($questionsAndAnswers, 5).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 6).': '.$this->getAnswerByPosition($questionsAndAnswers, 6).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 7).': '.$this->getAnswerByPosition($questionsAndAnswers, 7).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 8).': '.$this->getAnswerByPosition($questionsAndAnswers, 8).",\n";
        $dispatchNotes = $dispatchNotes.$this->getQuestionByPosition($questionsAndAnswers, 9).': '.$this->getAnswerByPosition($questionsAndAnswers, 9);
        if ($USphoneNumber == '') {
            $dispatchNotes = $dispatchNotes.",\n".'Phone: '.$formattedPhoneNumber;
        }
        
        return [
            'id' => 'supersalesforce',
            'project' => [
                'identifier' => $projectIdentifier,
                'name' => $this->getAnswerByPosition($questionsAndAnswers, 0),
                'description' => $dispatchNotes,
                'customer' => [
                    'first_name' => $payload['first_name'] ?? '',
                    'last_name' => $payload['last_name'] ?? '',
                    'phone_number' => $USphoneNumber,
                    'email' => $payload['email'] ?? '',
                ],
                'jobs' => [
                    [
                        'identifier' => 'JOB-' .$projectIdentifier . '-1',
                        'is_primary' => true,
                        'job_type' => [
                            'identifier' => 'local-move-move', // This will be defined elsewhere as mentioned
                        ],
                        'status' => 'BOOKED',
                        'name' => 'Moving Job',
                        'move_size' => $moveSize,
                        'crew_size' => '2',
                        'date' => $formattedDate,
                        'start_time_1' => $startTime,
                        'start_time_2' => '',
                        'additional_notes' => '',
                        'dispatch_notes' => '',
                        'office_notes' => '',
                        'note_to_customer' => '',
                        'referral_source' => $referralSource,
                        'referral_details' => '',
                        'locations' => [
                            [
                                'address' => $addressParts['street'] ?? $originAddress,
                                'city' => $addressParts['city'] ?? '',
                                'zip_code' => $addressParts['zip'] ?? '',
                                'latitude' => 0,
                                'longitude' => 0,
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
                                'latitude' => 0,
                                'longitude' => 0,
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
    
    private function getQuestionByPosition(array $questionsAndAnswers, int $questionPosition): ?string
    {
        foreach ($questionsAndAnswers as $qa) {
            if ($qa['position'] === $questionPosition) {
                return $qa['question'];
            }
        }
        
        return null;
    }
    private function getAnswerByPosition(array $questionsAndAnswers, int $questionPosition): ?string
    {
        foreach ($questionsAndAnswers as $qa) {
            if ($qa['position'] === $questionPosition) {
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
            'zip' => trim($parts[2] ?? ''), // No zip in the example data
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

        $numbers = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Check if it's US number
        if (strlen($numbers) == 11 && substr($numbers, 0, 1) == '1') {
            $numbers = substr($numbers, -10);
        }
        
        // Pad shorter numbers to 10 digits
        // if (strlen($numbers) < 10) {
        //     return str_pad($numbers, 10, '0', STR_PAD_LEFT);
        // }
        
        return $numbers;
    }
}