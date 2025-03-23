<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home Page</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
    <nav>
        <ul>
            <li><a href="{{ route('members.index') }}">Members</a></li>
            <li><a href="{{ route('payments.index') }}">Payments</a></li>
            <li><a href="#">Other</a></li>
        </ul>
    </nav>
    <div class="content">
        <h1>Welcome to the Home Page</h1>
        <p>Select an option from the menu to get started.</p>
    </div>
</body>
</html>