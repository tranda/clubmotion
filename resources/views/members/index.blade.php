// filepath: /d:/Projects/motion/club.motion.rs/clubmotion/resources/views/members/index.blade.php
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Members List</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
    <nav>
        <ul>
            <li><a href="{{ route('home') }}">Home</a></li>
            <li><a href="{{ route('payments.index') }}">Payments</a></li>
            <li><a href="#">Other</a></li>
        </ul>
    </nav>
    <div class="content">
        <h1>Members List</h1>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Membership Number</th>
                    <th>Email</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                @foreach($members as $member)
                    <tr>
                        <td>{{ $member->member_id }}</td>
                        <td>{{ $member->name }}</td>
                        <td>{{ $member->membership_number }}</td>
                        <td>{{ $member->email }}</td>
                        <td>{{ $member->category->category_name ?? 'N/A' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</body>
</html>