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
    const [pulling, setPulling] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

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

    // Load competitions whenever the team changes.
    useEffect(() => {
        setCompetition('');
        setCompetitions([]);
        setResult(null);
        if (!team) return;

        setLoadingComps(true);
        setError(null);
        jsonGet(`/achievements/dbcrews/competitions?team=${encodeURIComponent(team)}`)
            .then((data) => setCompetitions(data.competitions || []))
            .catch((e) => setError(e.message))
            .finally(() => setLoadingComps(false));
    }, [team]);

    const handlePull = async () => {
        if (!team) return;
        setPulling(true);
        setError(null);
        setResult(null);

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
                body: JSON.stringify({ team, competition: competition || null }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Pull failed (${res.status})`);
            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setPulling(false);
        }
    };

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
                            onChange={(e) => setCompetition(e.target.value)}
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
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => router.get('/achievements')}
                            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={pulling}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePull}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                            disabled={!team || pulling}
                        >
                            {pulling ? 'Pulling…' : 'Pull Achievements'}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                            <p className="text-green-900 font-semibold">
                                Pull complete — {result.inserted} inserted, {result.skipped} skipped (of {result.total} record{result.total === 1 ? '' : 's'}).
                            </p>
                            {result.unmatched?.length > 0 && (
                                <div className="text-sm text-green-900">
                                    <p className="font-medium mt-1">
                                        {result.unmatched.length} unmatched (no member with that membership number):
                                    </p>
                                    <ul className="list-disc ml-5 mt-1">
                                        {result.unmatched.map((u, i) => (
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
