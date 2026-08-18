import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function PullDbcrews() {
    const { csrf_token } = usePage().props;

    const [teams, setTeams] = useState([]);
    const [competitions, setCompetitions] = useState([]);
    const [team, setTeam] = useState('');
    const [competition, setCompetition] = useState(''); // '' = all competitions

    const [loadingTeams, setLoadingTeams] = useState(true);
    const [loadingComps, setLoadingComps] = useState(false);
    const [busy, setBusy] = useState(false); // 'preview' | 'apply' | false
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null); // dry-run result
    const [applied, setApplied] = useState(null); // final result after Apply

    const jsonGet = async (url) => {
        const res = await fetch(url, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
    };

    // Load teams on mount.
    useEffect(() => {
        jsonGet('/achievements/dbcrews/teams')
            .then((data) => setTeams(data.teams || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoadingTeams(false));
    }, []);

    // Reset preview/apply state when the selection changes.
    const resetOutput = () => {
        setPreview(null);
        setApplied(null);
        setError(null);
    };

    // Load competitions whenever the team changes.
    useEffect(() => {
        setCompetition('');
        setCompetitions([]);
        resetOutput();
        if (!team) return;

        setLoadingComps(true);
        jsonGet(`/achievements/dbcrews/competitions?team=${encodeURIComponent(team)}`)
            .then((data) => setCompetitions(data.competitions || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoadingComps(false));
    }, [team]);

    const runPull = async (dryRun) => {
        if (!team) return;
        setBusy(dryRun ? 'preview' : 'apply');
        setError(null);

        try {
            const res = await fetch('/achievements/pull', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ team, competition: competition || null, dry_run: dryRun }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

            if (dryRun) {
                setPreview(data);
                setApplied(null);
            } else {
                setApplied(data);
                setPreview(null); // consumed
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const canApply = preview && preview.inserted > 0 && !busy;

    return (
        <Layout>
            <div className="py-4 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Pull Achievements from dbcrews</h1>

                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                    {/* Team selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                        <select
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            disabled={loadingTeams}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">{loadingTeams ? 'Loading teams…' : 'Select a team…'}</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}{t.type ? ` (${t.type})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Competition selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Competition</label>
                        <select
                            value={competition}
                            onChange={(e) => { setCompetition(e.target.value); resetOutput(); }}
                            disabled={!team || loadingComps}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                        >
                            <option value="">{loadingComps ? 'Loading competitions…' : 'All competitions'}</option>
                            {competitions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}{c.year ? ` — ${c.year}` : ''}{c.location ? `, ${c.location}` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Leave as “All competitions” to pull every event for this team.</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => router.get('/achievements')}
                            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={!!busy}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => runPull(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            disabled={!team || !!busy}
                        >
                            {busy === 'preview' ? 'Checking…' : 'Preview (dry run)'}
                        </button>
                        <button
                            type="button"
                            onClick={() => runPull(false)}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                            disabled={!canApply}
                            title={!preview ? 'Run a preview first' : (preview.inserted === 0 ? 'Nothing new to insert' : '')}
                        >
                            {busy === 'apply' ? 'Applying…' : `Apply${preview ? ` (${preview.inserted})` : ''}`}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Dry-run preview */}
                    {preview && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                            <p className="text-blue-900 font-semibold">
                                Dry run — <strong>{preview.inserted}</strong> would be inserted, {preview.skipped} skipped (of {preview.total} record{preview.total === 1 ? '' : 's'}). Nothing was written.
                            </p>
                            {preview.inserted > 0 ? (
                                <div className="text-sm text-blue-900">
                                    <p className="font-medium mt-1">Would insert:</p>
                                    <ul className="list-disc ml-5 mt-1 max-h-64 overflow-auto">
                                        {preview.preview.map((r, i) => (
                                            <li key={i}>
                                                #{r.membership_number} {r.name} — {r.race} — <strong>{r.medal}</strong> <span className="text-blue-700">({r.event}{r.year ? ` ${r.year}` : ''})</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-2 text-blue-800">Press <strong>Apply</strong> to insert these.</p>
                                </div>
                            ) : (
                                <p className="text-sm text-blue-800">Nothing new to insert — everything is already recorded.</p>
                            )}
                            {preview.unmatched?.length > 0 && (
                                <div className="text-sm text-blue-900">
                                    <p className="font-medium mt-2">{preview.unmatched.length} unmatched (no member with that membership number):</p>
                                    <ul className="list-disc ml-5 mt-1 max-h-40 overflow-auto">
                                        {preview.unmatched.map((u, i) => (
                                            <li key={i}>#{u.membership_number}{u.name ? ` — ${u.name}` : ''}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applied result */}
                    {applied && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                            <p className="text-green-900 font-semibold">
                                Applied — <strong>{applied.inserted}</strong> inserted, {applied.skipped} skipped (of {applied.total} record{applied.total === 1 ? '' : 's'}).
                            </p>
                            {applied.unmatched?.length > 0 && (
                                <div className="text-sm text-green-900">
                                    <p className="font-medium mt-1">{applied.unmatched.length} unmatched (no member with that membership number):</p>
                                    <ul className="list-disc ml-5 mt-1 max-h-40 overflow-auto">
                                        {applied.unmatched.map((u, i) => (
                                            <li key={i}>#{u.membership_number}{u.name ? ` — ${u.name}` : ''}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
