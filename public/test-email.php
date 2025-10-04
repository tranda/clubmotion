<?php
/**
 * Email test script - DELETE after testing
 */

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// EDIT THIS: Put your email address here to receive test email
$testEmailTo = 'tranda@gmail.com'; // <-- CHANGE THIS

try {
    // Test email sending
    $sent = Mail::raw('This is a test email from ClubMotion. If you receive this, email is working!', function ($message) use ($testEmailTo) {
        $message->to($testEmailTo)
                ->subject('ClubMotion Email Test');
    });

    echo "<h1>Email Test Results</h1>";
    echo "<p>Email sent successfully!</p>";
    echo "<p>Check your inbox (and spam folder) for the test email.</p>";

    // Show configuration
    echo "<h2>Mail Configuration:</h2>";
    echo "<pre>";
    echo "MAIL_MAILER: " . config('mail.default') . "\n";
    echo "MAIL_HOST: " . config('mail.mailers.smtp.host') . "\n";
    echo "MAIL_PORT: " . config('mail.mailers.smtp.port') . "\n";
    echo "MAIL_USERNAME: " . config('mail.mailers.smtp.username') . "\n";
    echo "MAIL_ENCRYPTION: " . config('mail.mailers.smtp.encryption') . "\n";
    echo "MAIL_FROM: " . config('mail.from.address') . "\n";
    echo "</pre>";

} catch (Exception $e) {
    echo "<h1>Email Test FAILED</h1>";
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

echo "<p style='color: red; font-weight: bold;'>DELETE this file (test-email.php) after testing!</p>";
?>
