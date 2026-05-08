import { Link, router, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function LedgerImport({ recentBatches }) {
    const wipeBatch = (b) => {
        const msg = `Permanently delete batch #${b.id} and all ${b.entry_count ?? ''} ledger entries it created? This cannot be undone.`;
        if (!window.confirm(msg)) return;
        router.delete(`/ledger/import/${b.id}/wipe`);
    };
    const form = useForm({
        xlsx_file: null,
        default_year: new Date().getFullYear(),
    });

    const submit = (e) => {
        e.preventDefault();
        form.post('/ledger/import', { forceFormData: true });
    };

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Import ledger</h1>
                    <Link href="/ledger" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Ledger</Link>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 mb-4">
                    In Google Sheets: <strong>File → Download → Microsoft Excel (.xlsx)</strong>. Then upload the file here. All 12 tabs are read in one pass.
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">XLSX / ODS file</label>
                        <input
                            type="file"
                            accept=".xlsx,.ods,.xls"
                            required
                            onChange={(e) => form.setData('xlsx_file', e.target.files[0] ?? null)}
                            className="w-full text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Up to 20 MB. Tab names are used as month labels.</p>
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
                        {form.processing ? 'Reading…' : 'Read & review'}
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
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                {b.status === 'staging' && (
                                                    <Link href={`/ledger/import/${b.id}`} className="text-blue-600 hover:underline text-xs">Resume review →</Link>
                                                )}
                                                {b.status === 'committed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => wipeBatch(b)}
                                                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                                                        title="Permanently delete this batch and all its imported entries"
                                                    >
                                                        Wipe
                                                    </button>
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
