import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import MemberCard, { DESIGN_LABELS } from '../../Components/MemberCard';

// Shown in previews when the admin has no member profile of their own.
const EXAMPLE = {
    name: 'Ana Petrović',
    memberNumber: 42,
    edbfId: 'SRB-1234',
    category: 'Senior B',
    memberSince: '2019',
    isActive: true,
    photoUrl: null,
};

export default function MemberCardSettings({ card, designs, sample }) {
    const member = sample || EXAMPLE;
    const { data, setData, post, processing, errors } = useForm({
        design: card.design,
        text_tone: card.textTone,
        background: null,
        remove_background: false,
    });

    // Local preview of a newly picked file before it is saved.
    const [filePreview, setFilePreview] = useState(null);
    useEffect(() => {
        if (!data.background) { setFilePreview(null); return; }
        const url = URL.createObjectURL(data.background);
        setFilePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [data.background]);

    const bg = filePreview || (data.remove_background ? null : card.backgroundUrl);
    const previewCard = { design: data.design, textTone: data.text_tone };

    const submit = (e) => {
        e.preventDefault();
        post('/settings/member-card', { forceFormData: true, preserveScroll: true, onSuccess: () => setData('background', null) });
    };

    return (
        <Layout>
            <Head title="Member card settings" />
            <form onSubmit={submit} className="max-w-5xl mx-auto py-6 space-y-6">
                <div>
                    <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-800">← Settings</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">Member card</h1>
                    <p className="text-sm text-gray-600">
                        Digital card members open from <strong>Show Card</strong> in their menu. Pick a layout, and optionally upload your own background.
                    </p>
                </div>

                <section className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <h2 className="font-semibold text-gray-900 mb-3">1. Layout</h2>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                        {designs.map((d) => (
                            <label
                                key={d}
                                className={`cursor-pointer rounded-xl p-3 border-2 transition-colors ${data.design === d ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-gray-50'}`}
                            >
                                <input type="radio" name="design" value={d} checked={data.design === d} onChange={() => setData('design', d)} className="sr-only" />
                                <MemberCard member={member} card={{ design: d, textTone: data.text_tone }} backgroundOverride={bg} />
                                <span className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                                    <span className={`w-4 h-4 rounded-full border-2 ${data.design === d ? 'border-teal-500 bg-teal-500' : 'border-gray-300'}`} />
                                    {DESIGN_LABELS[d]}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
                    <div>
                        <h2 className="font-semibold text-gray-900">2. Custom background (optional)</h2>
                        <p className="text-sm text-gray-600">
                            Portrait (vertical) image, credit-card ratio (about 638 × 1012 px or larger), JPG/PNG/WebP up to 4 MB.
                            It replaces the layout's own colors and logo; member data is drawn on top, so keep the photo and text areas fairly plain.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => { setData((d) => ({ ...d, background: e.target.files[0] || null, remove_background: false })); }}
                            className="text-sm"
                        />
                        {card.backgroundUrl && !data.background && (
                            <label className="inline-flex items-center gap-2 text-sm text-red-700">
                                <input type="checkbox" checked={data.remove_background} onChange={(e) => setData('remove_background', e.target.checked)} />
                                Remove uploaded background
                            </label>
                        )}
                    </div>
                    {errors.background && <p className="text-sm text-red-600">{errors.background}</p>}

                    {bg && (
                        <div>
                            <span className="block text-sm font-medium text-gray-700 mb-1">Text color on the background</span>
                            <div className="flex gap-2">
                                {[['light', 'Light text'], ['dark', 'Dark text']].map(([v, label]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setData('text_tone', v)}
                                        className={`px-3 py-1.5 rounded-md text-sm border ${data.text_tone === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-lg shadow p-4 sm:p-6">
                    <h2 className="font-semibold text-gray-900 mb-3">Preview{sample ? ' (your card)' : ' (example member)'}</h2>
                    <div className="max-w-xs">
                        <MemberCard member={member} card={previewCard} backgroundOverride={bg} />
                    </div>
                </section>

                <div className="flex justify-end">
                    <button type="submit" disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </Layout>
    );
}
