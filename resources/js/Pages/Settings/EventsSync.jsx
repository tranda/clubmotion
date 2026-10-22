import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';

const FIELDS = [
    { key: 'edbf_id', label: 'EDBF ID' },
    { key: 'birth_date', label: 'Birth date' },
    { key: 'gender', label: 'Gender' },
];

const MATCH_LABEL = {
    exact: { text: 'Name + birth date', cls: 'bg-green-100 text-green-800' },
    name: { text: 'Name only', cls: 'bg-green-50 text-green-700' },
    dob_differs: { text: 'Birth date differs', cls: 'bg-amber-100 text-amber-800' },
    partial: { text: 'Partial name', cls: 'bg-amber-100 text-amber-800' },
};

const fmtDate = (ymd) => (ymd ? ymd.split('-').reverse().join('.') : null);
const show = (field, value) => {
    if (!value) return '—';
    if (field === 'birth_date') return fmtDate(value);
    if (field === 'gender') return value === 'M' ? 'Male' : 'Female';
    return value;
};

// For one member/athlete pair: the fields that would change in this direction.
function changesFor(pair, fields, direction) {
    const [from, to] = direction === 'pull' ? [pair.events, pair.club] : [pair.club, pair.events];
    return fields
        .filter((f) => from[f] && from[f] !== to[f])
        .map((f) => ({ field: f, current: to[f], next: from[f] }));
}

// Review page: pick fields + direction, tick rows, then save or send.
export default function EventsSync({ error, club, athleteCount, memberCount, pairs, ambiguous, unmatched, safe }) {
    const [fields, setFields] = useState(['edbf_id']);
    const [direction, setDirection] = useState('pull');
    const [checked, setChecked] = useState({});
    const [confirm, setConfirm] = useState(false);
    const [processing, setProcessing] = useState(false);

    const rows = useMemo(
        () => pairs.map((p) => ({ ...p, changes: changesFor(p, fields, direction) })).filter((p) => p.changes.length),
        [pairs, fields, direction],
    );

    // Pre-tick safe matches that only fill empty values; anything that
    // overwrites a value, or a doubtful match, needs a manual tick.
    useEffect(() => {
        setChecked(Object.fromEntries(rows.map((r) => [
            r.member_id,
            safe.includes(r.match) && r.changes.every((c) => !c.current),
        ])));
    }, [rows]);

    const selected = rows.filter((r) => checked[r.member_id]);
    const toggleField = (key) => setFields((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));
    const setAll = (value) => setChecked(Object.fromEntries(rows.map((r) => [r.member_id, value])));

    const submit = () => {
        setConfirm(false);
        setProcessing(true);
        const values = (r) => Object.fromEntries(r.changes.map((c) => [c.field, c.next]));
        if (direction === 'pull') {
            router.post('/settings/events/sync/pull', {
                updates: Object.fromEntries(selected.map((r) => [r.member_id, values(r)])),
            }, { preserveScroll: true, onFinish: () => setProcessing(false) });
        } else {
            router.post('/settings/events/sync/push', {
                updates: selected.map((r) => ({ id: r.athlete_id, ...values(r) })),
            }, { preserveScroll: true, onFinish: () => setProcessing(false) });
        }
    };

    const target = direction === 'pull' ? 'ClubMotion' : 'the events platform';

    return (
        <Layout>
            <Head title="Sync with events platform" />
            <div className="max-w-4xl mx-auto py-6 space-y-5">
                <div>
                    <Link href="/settings/events" className="text-sm text-blue-600 hover:text-blue-800">← Events platform</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">Sync with events platform</h1>
                </div>

                {error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
                ) : (
                    <>
                        <p className="text-sm text-gray-600">
                            <strong>{club}</strong> on the events platform has {athleteCount} athlete(s); {pairs.length} of our {memberCount} member(s) matched by name and birth date.
                        </p>

                        <div className="bg-white rounded-lg shadow p-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <span className="block text-sm font-medium text-gray-700 mb-2">Fields</span>
                                <div className="flex flex-wrap gap-2">
                                    {FIELDS.map((f) => (
                                        <label key={f.key} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer ${fields.includes(f.key) ? 'bg-teal-50 border-teal-400 text-teal-900' : 'bg-white border-gray-300 text-gray-700'}`}>
                                            <input type="checkbox" checked={fields.includes(f.key)} onChange={() => toggleField(f.key)} />
                                            {f.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="block text-sm font-medium text-gray-700 mb-2">Direction</span>
                                <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
                                    {[['pull', 'Events → ClubMotion'], ['push', 'ClubMotion → Events']].map(([v, label]) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setDirection(v)}
                                            className={`px-3 py-1.5 ${direction === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    {direction === 'pull'
                                        ? 'Take the values from the events platform and save them on our members.'
                                        : 'Send our members\' values to their athletes on the events platform.'}
                                </p>
                            </div>
                        </div>

                        {fields.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Pick at least one field.</div>
                        ) : rows.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Nothing to change for these fields: matched members are already the same.</div>
                        ) : (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between text-sm text-gray-600">
                                    <span>{rows.length} member(s) with differences. Ticked rows only fill empty values. Overwrites and amber rows need your tick.</span>
                                    <span className="shrink-0 ml-3 space-x-3">
                                        <button type="button" onClick={() => setAll(true)} className="text-blue-600 hover:text-blue-800">All</button>
                                        <button type="button" onClick={() => setAll(false)} className="text-blue-600 hover:text-blue-800">None</button>
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {rows.map((r) => {
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
                                                        Club: born {show('birth_date', r.club.birth_date)} · Events: {r.athlete_name}, born {show('birth_date', r.events.birth_date)}
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm shrink-0 space-y-0.5">
                                                    {r.changes.map((c) => (
                                                        <div key={c.field}>
                                                            <span className="text-xs text-gray-500 mr-1">{FIELDS.find((f) => f.key === c.field).label}:</span>
                                                            {c.current && <span className="text-xs text-red-600 line-through mr-1">{show(c.field, c.current)}</span>}
                                                            <span className="font-mono font-semibold text-gray-900">{show(c.field, c.next)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
                                    <span className="text-sm text-gray-600">{selected.length} selected</span>
                                    <button
                                        type="button"
                                        onClick={() => setConfirm(true)}
                                        disabled={processing || selected.length === 0}
                                        className={`px-5 py-2 text-white rounded-lg disabled:opacity-50 ${direction === 'pull' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                                    >
                                        {processing ? 'Saving…' : direction === 'pull' ? `Save ${selected.length} to ClubMotion` : `Send ${selected.length} to events`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {ambiguous.length > 0 && (
                            <details className="bg-white rounded-lg shadow p-4">
                                <summary className="cursor-pointer font-medium text-gray-800">Several possible athletes ({ambiguous.length}). Sync these by hand</summary>
                                <ul className="mt-3 space-y-2 text-sm">
                                    {ambiguous.map((r) => (
                                        <li key={r.member_id}>
                                            <span className="font-medium">{r.member_name}</span> (born {show('birth_date', r.club.birth_date)}):{' '}
                                            {r.candidates.map((c) => `${c.name}, born ${show('birth_date', c.birth_date)}, EDBF ${show('edbf_id', c.edbf_id)}`).join('; ')}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        {unmatched.length > 0 && (
                            <details className="bg-white rounded-lg shadow p-4">
                                <summary className="cursor-pointer font-medium text-gray-800">Athletes not matched to any member ({unmatched.length})</summary>
                                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                                    {unmatched.map((a, i) => (
                                        <li key={i}>{a.name} · born {show('birth_date', a.birth_date)} · EDBF <span className="font-mono">{show('edbf_id', a.edbf_id)}</span></li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </>
                )}
            </div>

            <ConfirmModal
                open={confirm}
                title={direction === 'pull' ? 'Save to ClubMotion?' : 'Send to events platform?'}
                message={<>Update {selected.length} {direction === 'pull' ? 'member(s)' : 'athlete(s)'} in {target}: {fields.map((f) => FIELDS.find((x) => x.key === f).label).join(', ')}.</>}
                confirmLabel={direction === 'pull' ? 'Save' : 'Send'}
                onConfirm={submit}
                onCancel={() => setConfirm(false)}
            />
        </Layout>
    );
}
