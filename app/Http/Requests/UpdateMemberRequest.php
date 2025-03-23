<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
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
            'name' => 'sometimes|required|string|max:255',
            'membership_number' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('members', 'membership_number')->ignore($this->route('member')),
            ],
            'date_of_birth' => 'nullable|date',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('members', 'email')->ignore($this->route('member')),
            ],
            'category_id' => 'sometimes|required|exists:membership_categories,category_id',
            'medical_validity' => 'nullable|date',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // Example image validation
            'password' => 'nullable|string|min:8|confirmed',
            'is_active' => 'sometimes|required|boolean',
        ];
    }
}