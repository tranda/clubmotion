<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Member</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
</head>
<body>
    <div class="content">
        <h1>Edit Member Details</h1>
        <form action="{{ route('members.update', $member->id) }}" method="POST" enctype="multipart/form-data">
            @csrf
            @method('PUT')

            <label>Name:</label>
            <input type="text" name="name" value="{{ $member->name }}" required>

            <label>Membership ID:</label>
            <input type="text" name="membership_number" value="{{ $member->membership_number }}" required>

            <label>Date of Birth:</label>
            <input type="date" name="date_of_birth" value="{{ $member->date_of_birth }}">

            <label>Address:</label>
            <input type="text" name="address" value="{{ $member->address }}">

            <label>Phone:</label>
            <input type="text" name="phone" value="{{ $member->phone }}">

            <label>Email:</label>
            <input type="email" name="email" value="{{ $member->email }}">

            <label>Category:</label>
            <select name="category_id">
                @foreach($categories as $category)
                    <option value="{{ $category->id }}" {{ $member->category_id == $category->id ? 'selected' : '' }}>
                        {{ $category->category_name }}
                    </option>
                @endforeach
            </select>

            <label>Medical Validity:</label>
            <input type="date" name="medical_validity" value="{{ $member->medical_validity }}">

            <label>Active:</label>
            <select name="is_active">
                <option value="1" {{ $member->is_active ? 'selected' : '' }}>Yes</option>
                <option value="0" {{ !$member->is_active ? 'selected' : '' }}>No</option>
            </select>
            <label for="image">Current Picture:</label>
            @if($member->image)
                <img src="{{ asset('storage/' . $member->image) }}" alt="Member Image" width="150">
            @endif

            <label for="image">Upload New Picture:</label>
            <input type="file" name="image" accept="image/*">

            <button type="submit" class="btn-save">Save Changes</button>
        </form>
        <button onclick="history.back()" class="btn-back">⬅ Cancel</button>
    </div>
</body>
</html>
