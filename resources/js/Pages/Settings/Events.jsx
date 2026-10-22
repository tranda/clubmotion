import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';

// Settings → Events platform: connection to events.motion.rs (for EDBF IDs).
export default function EventsSettings({ url, club, hasKey }) {
    const { data, setData, post, processing, errors } = useForm({ url, club, key: '', remove_key: false });

    const submit = (e) => {
        e.preventDefault();
        post('/settings/events', { preserveScroll: true, onSuccess: () => setData('key', '') });
    };

    const input = 'w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm';

    return (
        <Layout>
            <Head title="Events platform" />
            <div className="max-w-2xl mx-auto py-6 space-y-6">
                <div>
                    <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-800">← Settings</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">Events platform</h1>
                    <p className="text-sm text-gray-600">
                        Connection to events.motion.rs, used to sync member data (EDBF ID, birth date, gender) with our club's athletes there.
                    </p>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API key</label>
                        <input
                            type="password"
                            autoComplete="off"
                            value={data.key}
                            onChange={(e) => setData('key', e.target.value)}
                            placeholder={hasKey ? 'Saved. Enter a new key to replace it' : 'Paste the key from events.motion.rs'}
                            className={input}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Create it on events.motion.rs under Administration → API keys, with <code>athletes.read</code> (to fetch) and <code>athletes.write</code> (to send our data). Stored encrypted.
                        </p>
                        {hasKey && !data.key && (
                            <label className="mt-2 inline-flex items-center gap-2 text-sm text-red-700">
                                <input type="checkbox" checked={data.remove_key} onChange={(e) => setData('remove_key', e.target.checked)} />
                                Remove saved key
                            </label>
                        )}
                        {errors.key && <p className="text-sm text-red-600">{errors.key}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Club on the events platform</label>
                        <input value={data.club} onChange={(e) => setData('club', e.target.value)} className={input} />
                        <p className="mt-1 text-xs text-gray-500">Club name exactly as on events.motion.rs (or its numeric id).</p>
                        {errors.club && <p className="text-sm text-red-600">{errors.club}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API address</label>
                        <input value={data.url} onChange={(e) => setData('url', e.target.value)} className={input} />
                        {errors.url && <p className="text-sm text-red-600">{errors.url}</p>}
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={processing} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {processing ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">Sync with events platform</h2>
                        <p className="text-sm text-gray-600">Match athletes to members, choose fields, then take values from events or send ours there.</p>
                    </div>
                    {hasKey ? (
                        <Link href="/settings/events/sync" className="shrink-0 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-center">
                            Open sync
                        </Link>
                    ) : (
                        <span className="text-sm text-gray-400">Save an API key first</span>
                    )}
                </div>
            </div>
        </Layout>
    );
}
