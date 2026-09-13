<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class JoinRequestMessage extends Mailable
{
    use Queueable, SerializesModels;

    public string $bodyText;

    /**
     * @param  string  $subjectLine  Email subject
     * @param  string  $bodyText     Plain-text body written by the admin
     */
    public function __construct(string $subjectLine, string $bodyText)
    {
        $this->subject = $subjectLine;
        $this->bodyText = $bodyText;
    }

    public function build()
    {
        return $this->view('emails.join_request_message')
            ->with(['bodyText' => $this->bodyText]);
    }
}
