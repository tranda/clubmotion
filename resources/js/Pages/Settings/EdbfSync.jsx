import { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const MATCH_LABEL = {
    exact: { text: 'Name + birth date', cls: 'bg-green-100 text-green-800' },
    name: { text: 'Name only', cls: 'bg-green-50 text-green-700' },
    dob_differs: { text: 'Birth date differs', cls: 'bg-amber-100 text-amber-800' },
    partial: { text: 'Partial name', cls: 'bg-amber-100 text-amber-800' },
    ambiguous: { text: 'Several athletes', cls: 'bg-red-100 text-red-700' },
};

const fmt = (ymd) => (ymd ? ymd.split('-').reverse().join('.') : '—');

// Review EDBF IDs fetched from the events platform before saving them.
export default function EdbfSync({ error, club, athleteCount, withEdbf, rows, unmatched, safe }) {
    const actionable = rows.filter((r) => r.status !== 'same' && r.match !== 'ambiguous');
    const same = rows.filter((r) => r.status === 'same').length;

    // Pre-tick only safe matches that fill an empty EDBF ID.
    const [checked, setChecked] = useState(() => Object.fromEntries(
        actionable.map((r) => [r.member_id, r.status === 'new' && safe.includes(r.match)]),
    ));
    const [processing, setProcessing] = useState(false);
    const selected = useMemo(() => actionable.filter((r) => checked[r.member_id]), [checked, actionable]);

    const save = () => {
        setProcessing(true);
        router.post('/settings/events/edbf-sync', {
            edbf_ids: Object.fromEntries(selected.map((r) => [r.member_id, r.proposed])),
        }, { onFinish: () => setProcessing(false) });
    };

    const ambiguous = rows.filter((r) => r.match === 'ambiguous');

    return (
        <Layout>
            <Head title="Sync EDBF IDs" />
            <div className="max-w-4xl mx-auto py-6 space-y-5">
                <div>
                    <Link href="/settings/events" className="text-sm text-blue-600 hover:text-blue-800">← Events platform</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">Sync EDBF IDs</h1>
                </div>

                {error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
                ) : (
                    <>
                        <p className="text-sm text-gray-600">
                            <strong>{club}</strong> on the events platform has {athleteCount} athlete(s), {withEdbf} with an EDBF ID.
                            Matched by name and birth date: {rows.length} member(s), {same} already up to date.
                            Ticked rows fill an empty EDBF ID from a safe match. Check the amber rows before ticking them.
                        </p>

                        {actionable.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Nothing to update.</div>
                        ) : (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="divide-y divide-gray-200">
                                    {actionable.map((r) => {
                                        const m = MATCH_LABEL[r.match];
                                        return (
                                            <label key={r.member_id} className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${safe.includes(r.match) ? '' : 'bg-amber-50/60'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="mt-1"
                                                    checked={!!checked[r.member_id]}
                                                    onChange={(e) => setChecked((c) => ({ ...c, [r.member_id]: e.target.checked }))}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-medium text-gray-900">{r.member_name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${m.cls}`}>{m.text}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        Member born {fmt(r.member_dob)} · Events: {r.athlete_name}, born {fmt(r.athlete_dob)}
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm shrink-0">
                                                    {r.status === 'different' && <div className="text-xs text-red-600 line-through">{r.current}</div>}
                                                    <div className="font-mono font-semibold text-gray-900">{r.proposed}</div>
                                                    {r.status === 'different' && <div className="text-xs text-red-600">replaces current</div>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                                    <span className="text-sm text-gray-600">{selected.length} selected</span>
                                    <button
                                        type="button"
                                        onClick={save}
                                        disabled={processing || selected.length === 0}
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {processing ? 'Saving…' : `Save ${selected.length} EDBF ID(s)`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {ambiguous.length > 0 && (
                            <details className="bg-white rounded-lg shadow p-4">
                                <summary className="cursor-pointer font-medium text-gray-800">Several possible athletes ({ambiguous.length}). Enter these by hand</summary>
                                <ul className="mt-3 space-y-2 text-sm">
                                    {ambiguous.map((r) => (
                                        <li key={r.member_id}>
                                            <span className="font-medium">{r.member_name}</span> ({fmt(r.member_dob)}):{' '}
                                            {r.candidates.map((c) => `${c.name} ${fmt(c.dob)} → ${c.edbf_id}`).join('; ')}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        {unmatched.length > 0 && (
                            <details className="bg-white rounded-lg shadow p-4">
                                <summary className="cursor-pointer font-medium text-gray-800">Athletes with EDBF ID not matched to any member ({unmatched.length})</summary>
                                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                                    {unmatched.map((a, i) => (
                                        <li key={i}>{a.name} · born {fmt(a.dob)} · <span className="font-mono">{a.edbf_id}</span></li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
