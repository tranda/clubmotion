<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\ToolSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Digital membership card: members show it on their phone (e.g. at the gym).
 * Admins pick one of the built-in designs and can upload their own background.
 */
class MemberCardController extends Controller
{
    public const DESIGNS = ['wave', 'night', 'clean'];

    /** The logged-in member's own card. */
    public function mine(Request $request)
    {
        $member = $request->user()->member;

        return Inertia::render('MemberCard/Show', [
            'member' => $member ? self::cardData($member->load('category')) : null,
            'card' => self::config(),
        ]);
    }

    /** Any member's card (admin & superuser). */
    public function show(Member $member)
    {
        return Inertia::render('MemberCard/Show', [
            'member' => self::cardData($member->load('category')),
            'card' => self::config(),
            'backHref' => '/members/' . $member->id,
        ]);
    }

    public function settings(Request $request)
    {
        $member = $request->user()->member;

        return Inertia::render('Settings/MemberCard', [
            'card' => self::config(),
            'designs' => self::DESIGNS,
            'sample' => $member ? self::cardData($member->load('category')) : null,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'design' => 'required|in:' . implode(',', self::DESIGNS),
            'text_tone' => 'required|in:light,dark',
            'background' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'remove_background' => 'nullable|boolean',
        ]);

        ToolSetting::set('card_design', $data['design'], 'Member card: built-in design');
        ToolSetting::set('card_text_tone', $data['text_tone'], 'Member card: text color over uploaded background');

        $old = ToolSetting::get('card_background');

        if ($request->hasFile('background')) {
            $path = $request->file('background')->store('cards', 'public');
            ToolSetting::set('card_background', $path, 'Member card: uploaded background image');
            if ($old) {
                Storage::disk('public')->delete($old);
            }
        } elseif ($request->boolean('remove_background') && $old) {
            Storage::disk('public')->delete($old);
            ToolSetting::set('card_background', '');
        }

        return back()->with('success', 'Member card settings saved.');
    }

    public static function config(): array
    {
        $design = ToolSetting::get('card_design', 'wave');
        $background = ToolSetting::get('card_background');

        return [
            'design' => in_array($design, self::DESIGNS, true) ? $design : 'wave',
            'textTone' => ToolSetting::get('card_text_tone', 'light') === 'dark' ? 'dark' : 'light',
            'backgroundUrl' => $background ? '/storage/' . $background : null,
        ];
    }

    public static function cardData(Member $member): array
    {
        $status = $member->exemption_status === 'pocasni' ? 'Honorary'
            : ($member->exemption_status === 'saradnik' ? 'Associate' : null);

        return [
            'id' => $member->id,
            'name' => $member->name,
            'memberNumber' => $member->membership_number,
            'edbfId' => $member->edbf_id,
            'category' => $member->category->category_name ?? null,
            'memberSince' => $member->registration_date ? $member->registration_date->format('Y') : null,
            'medicalValidity' => $member->medical_validity ? $member->medical_validity->format('Y-m-d') : null,
            'isActive' => (bool) $member->is_active,
            'status' => $status,
            'photoUrl' => $member->image ? '/storage/' . $member->image : null,
        ];
    }
}
