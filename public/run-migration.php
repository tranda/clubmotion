<?php
/**
 * Simple migration runner for shared hosting
 * DELETE THIS FILE after running!
 */

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$status = $kernel->handle(
    $input = new Symfony\Component\Console\Input\ArrayInput([
        'command' => 'migrate',
        '--force' => true,
    ]),
    new Symfony\Component\Console\Output\BufferedOutput
);

echo "<pre>";
echo "Migration Status: " . ($status === 0 ? "SUCCESS" : "FAILED") . "\n\n";
echo "Output:\n";
echo $kernel->output();
echo "</pre>";

echo "<p style='color: red; font-weight: bold;'>IMPORTANT: Delete this file (run-migration.php) from your server now!</p>";
?>
