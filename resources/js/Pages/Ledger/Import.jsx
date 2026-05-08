import { Link, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function LedgerImport({ recentBatches }) {
    const form = useForm({
        sheet_url: '',
        default_year: new Date().getFullYear(),
    });

    const submit = (e) => {
        e.preventDefault();
        form.post('/ledger/import');
    };

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Import from Google Sheets</h1>
                    <Link href="/ledger" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Ledger</Link>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
                    The sheet must be shared as <strong>“Anyone with the link — Viewer”</strong> for the import to read it.
                    You can revert sharing after the import completes.
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">Google Sheet URL</label>
                        <input
                            type="url"
                            required
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            value={form.data.sheet_url}
                            onChange={(e) => form.setData('sheet_url', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">Fallback year (used if a tab name has no year)</label>
                        <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={form.data.default_year}
                            onChange={(e) => form.setData('default_year', e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {Object.values(form.errors).map((err, i) => <div key={i}>{err}</div>)}
                        </div>
                    )}
                    <button type="submit" disabled={form.processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                        {form.processing ? 'Fetching tabs…' : 'Fetch & review'}
                    </button>
                </form>

                {recentBatches.length > 0 && (
                    <>
                        <h2 className="text-sm font-semibold text-gray-600 mb-2">Recent imports</h2>
                        <div className="bg-white rounded-lg shadow overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                        <th className="px-3 py-2 text-left">When</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-left">Source</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBatches.map((b) => (
                                        <tr key={b.id} className="border-t border-gray-100">
                                            <td className="px-3 py-2 whitespace-nowrap">{b.created_at?.replace('T', ' ').slice(0, 16)}</td>
                                            <td className="px-3 py-2 capitalize">{b.status}</td>
                                            <td className="px-3 py-2 truncate max-w-md">{b.source_url}</td>
                                            <td className="px-3 py-2 text-right">
                                                {b.status === 'staging' && (
                                                    <Link href={`/ledger/import/${b.id}`} className="text-blue-600 hover:underline text-xs">Resume review →</Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
