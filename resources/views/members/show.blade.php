<!-- resources/views/members/show.blade.php -->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Member Details</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
    <div class="content">
        <h1>{{ $member->name }}'s Details</h1>
        <table class="custom-table">
            <tr>
                <th>Name:</th>
                <td>{{ $member->name }}</td>
            </tr>
            <tr>
                <th>Membership Number:</th>
                <td>{{ $member->membership_number }}</td>
            </tr>
            <tr>
                <th>Date of Birth:</th>
                <td>{{ $member->date_of_birth }}</td>
            </tr>
            <tr>
                <th>Address:</th>
                <td>{{ $member->address }}</td>
            </tr>
            <tr>
                <th>Phone:</th>
                <td>{{ $member->phone }}</td>
            </tr>
            <tr>
                <th>Email:</th>
                <td>{{ $member->email }}</td>
            </tr>
            <tr>
                <th>Category:</th>
                <td>{{ $member->category_id->category_name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <th>Medical Validity:</th>
                <td>{{ $member->medical_validity }}</td>
            </tr>
        </table>
        <a href="{{ route('members.index') }}">Back to Members List</a>
    </div>
</body>
</html>
