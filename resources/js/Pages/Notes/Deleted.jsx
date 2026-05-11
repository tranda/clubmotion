import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

function formatAmount(value) {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotesDeleted({ entries }) {
    const restore = (id) => {
        router.post(`/notes/entries/${id}/restore`, {}, { preserveScroll: true });
    };

    return (
        <Layout>
            <div className="py-4 max-w-6xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Deleted notes</h1>
                    <Link href="/notes" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Notes</Link>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Deleted at</th>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Member</th>
                                <th className="px-3 py-2 text-left">Category</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 && (
                                <tr><td colSpan="7" className="px-3 py-6 text-center text-gray-400">No deleted notes.</td></tr>
                            )}
                            {entries.map((e) => (
                                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{e.deleted_at}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{e.entry_date_display}</td>
                                    <td className="px-3 py-2">{e.member?.name ?? <span className="text-gray-400">—</span>}</td>
                                    <td className="px-3 py-2">{e.category?.name ?? <span className="text-gray-400">—</span>}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(e.amount)}</td>
                                    <td className="px-3 py-2 text-gray-600">{e.description}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => restore(e.id)}
                                            className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                                        >
                                            Restore
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
