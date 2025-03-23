<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\MembershipCategoryResource;
use Illuminate\Support\Facades\Storage;

class MemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'membership_number' => $this->membership_number,
            'date_of_birth' => $this->date_of_birth ? $this->date_of_birth->format('Y-m-d') : null,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'category_id' => $this->category_id,
            'category' => new MembershipCategoryResource($this->whenLoaded('category')), // Include category if loaded
            'medical_validity' => $this->medical_validity ? $this->medical_validity->format('Y-m-d') : null,
            'profile_image_url' => $this->profile_image_url,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null,
            'updated_at' => $this->updated_at ? $this->updated_at->format('Y-m-d H:i:s') : null,
            'image' => $this->image ? Storage::url($this->image) : null, // Transform the path to a URL
        ];
    }
}