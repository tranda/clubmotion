import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';

const BUCKET_LABELS = { cash: 'Cash RSD', bank: 'Bank RSD', cash_eur: 'Cash EUR', eur: 'Bank EUR' };

function formatAmount(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LedgerDeleted({ year, month, entries }) {
    const [confirmRestore, setConfirmRestore] = useState(null);
    const restore = (entry) => setConfirmRestore(entry);
    const restoreSubmit = () => {
        if (!confirmRestore) return;
        const id = confirmRestore.id;
        setConfirmRestore(null);
        router.post(`/ledger/entries/${id}/restore`, {}, { preserveScroll: true });
    };

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Deleted entries — {String(month).padStart(2, '0')}/{year}</h1>
                    <Link href={`/ledger?year=${year}&month=${month}`} className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Ledger</Link>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Bucket</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2 text-left">Deleted at</th>
                                <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0 && (
                                <tr><td colSpan="7" className="px-3 py-6 text-center text-gray-400">No deleted entries this month.</td></tr>
                            )}
                            {entries.map((e) => (
                                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap">{e.entry_date_display}</td>
                                    <td className="px-3 py-2">{e.description}</td>
                                    <td className="px-3 py-2 capitalize">{e.type}</td>
                                    <td className="px-3 py-2">{BUCKET_LABELS[e.bucket]}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(e.amount)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">{e.deleted_at}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button onClick={() => restore(e)} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Restore</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                open={!!confirmRestore}
                title="Restore entry?"
                confirmLabel="Restore"
                message={confirmRestore && (
                    <>
                        <span className="text-gray-400">{confirmRestore.entry_date_display}</span>
                        {' — '}
                        <span className="font-medium text-gray-900">{confirmRestore.description}</span>
                    </>
                )}
                onConfirm={restoreSubmit}
                onCancel={() => setConfirmRestore(null)}
            />
        </Layout>
    );
}
