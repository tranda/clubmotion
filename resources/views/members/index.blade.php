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
    <div class="filter-container">
        <form method="GET" action="{{ route('members.index') }}">
            <label for="filter">Show:</label>
            <select name="filter" id="filter" onchange="this.form.submit()">
                <option value="" {{ $filter == '' ? 'selected' : '' }}>All Members</option>
                <option value="active" {{ $filter == 'active' ? 'selected' : '' }}>Active Members</option>
            </select>
        </form>
    </div>
    <div class="content">
        <h1>Members List</h1>
        <table class="custom-table">
            <thead>
                <tr>
                <!--    <th>ID</th> -->
                    <th>Name</th>
                    <th>ID</th>
                    <th>Date of Birth</th>
                <!--    <th>Address</th> -->
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Category</th>
                 <!--   <th>Medical</th> -->
                    <th>Active</th>
                </tr>
            </thead>
            <tbody>
                @foreach($members as $member)
                    <tr onclick="window.location='{{ route('members.show', $member->id) }}'">
                    <!--    <td>{{ $member->id }}</td> -->
                        <td>{{ $member->name }}</td>
                        <td>{{ $member->membership_number }}</td>
                        <td>{{ $member->date_of_birth }}</td>
                    <!--    <td>{{ $member->address }}</td> -->
                        <td>{{ $member->phone }}</td>
                        <td>{{ $member->email }}</td>
                        <td>{{ $member->category->category_name ?? 'N/A' }}</td>
                    <!--    <td>{{ $member->medical_validity }}</td> -->
                        <td>{{ $member->is_active ? '✅' : '❌' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</body>
</html>