<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // You might want to implement authorization logic here
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'membership_number' => 'required|string|unique:members,membership_number|max:255',
            'date_of_birth' => 'nullable|date',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => 'required|email|unique:members,email|max:255',
            'category_id' => 'required|exists:membership_categories,category_id',
            'medical_validity' => 'nullable|date',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // Example image validation
            'password' => 'nullable|string|min:8|confirmed',
            'is_active' => 'nullable|boolean',
        ];
    }
}