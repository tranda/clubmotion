<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Member</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
    <div class="content">
        <h1>Add New Member</h1>
        <form action="{{ route('members.store') }}" method="POST" enctype="multipart/form-data" class="member-form">
            @csrf
            <label>Name:</label>
            <input type="text" name="name" required>

            <label>Membership Number:</label>
            <input type="text" name="membership_number" required>

            <label>Date of Birth:</label>
            <input type="date" name="date_of_birth">

            <label>Address:</label>
            <input type="text" name="address">

            <label>Phone:</label>
            <input type="text" name="phone">

            <label>Email:</label>
            <input type="email" name="email">

            <label>Category:</label>
            <select name="category_id">
                <option value="">Select Category</option>
                @foreach($categories as $category)
                    <option value="{{ $category->id }}">{{ $category->category_name }}</option>
                @endforeach
            </select>

            <label>Medical Validity:</label>
            <input type="date" name="medical_validity">

            <label>Active:</label>
            <input type="checkbox" name="is_active" value="1">

            <label for="image">Upload Picture:</label>
            <input type="file" name="image" accept="image/*">

            <button type="submit" class="btn-save">✅ Save Member</button>
        </form>
        <a href="{{ route('members.index') }}" class="btn-back">⬅ Back to Members List</a>
    </div>
</body>
</html>
