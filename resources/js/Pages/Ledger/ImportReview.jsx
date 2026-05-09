import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';

const BUCKET_LABELS = { cash: 'Cash RSD', bank: 'Bank RSD', cash_eur: 'Cash EUR', eur: 'Bank EUR' };

export default function LedgerImportReview({ batch, groups, summary, categories, members, memberCategoryIds }) {
    const [mappings, setMappings] = useState(() => groups.map((g) => ({
        row_ids: g.row_ids,
        action: g.action ?? (g.suggested_category_id ? 'map_existing' : 'import_new_category'),
        mapped_category_id: g.mapped_category_id ?? g.suggested_category_id ?? '',
        new_category_name: g.description ?? '',
        new_category_kind: g.type === 'income' ? 'income' : g.type === 'expense' ? 'expense' : 'both',
        mapped_member_id: g.mapped_member_id ?? g.suggested_member_id ?? '',
    })));
    const [submitting, setSubmitting] = useState(false);

    const updateMapping = (idx, patch) => {
        setMappings((prev) => prev.map((m, i) => {
            if (i !== idx) return m;
            const next = { ...m, ...patch };
            // Income + member set → auto-pick category (Registration if "reg" in description, else Membership).
            if ('mapped_member_id' in patch) {
                const g = groups[idx];
                if (g.type === 'income' && patch.mapped_member_id) {
                    const desc = (g.normalized_description ?? '').toLowerCase();
                    const catId = desc.includes('reg')
                        ? memberCategoryIds.registration
                        : memberCategoryIds.membership;
                    next.action = 'map_existing';
                    next.mapped_category_id = String(catId);
                }
            }
            return next;
        }));
    };

    const commit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(`/ledger/import/${batch.id}/commit`, {
            mappings: mappings.map((m) => ({
                row_ids: m.row_ids,
                action: m.action,
                mapped_category_id: m.action === 'map_existing' ? (m.mapped_category_id || null) : null,
                new_category_name: m.action === 'import_new_category' ? m.new_category_name : null,
                new_category_kind: m.action === 'import_new_category' ? m.new_category_kind : null,
                mapped_member_id: m.mapped_member_id || null,
            })),
        }, {
            onFinish: () => setSubmitting(false),
        });
    };

    const cancelImport = () => {
        if (!window.confirm('Cancel this import? Staged rows will be discarded.')) return;
        router.delete(`/ledger/import/${batch.id}`);
    };

    return (
        <Layout>
            <div className="py-4 max-w-6xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Review import</h1>
                    <Link href="/ledger/import" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Imports</Link>
                </div>

                <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <div className="text-xs uppercase text-gray-500">Total rows</div>
                        <div className="text-lg font-semibold">{summary.total_rows}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-gray-500">Parseable</div>
                        <div className="text-lg font-semibold">{summary.parseable_rows}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-gray-500">Errors</div>
                        <div className="text-lg font-semibold text-red-700">{summary.errors}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase text-gray-500">Tabs</div>
                        <div className="text-lg font-semibold">{Object.keys(summary.tabs).length}</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-3 mb-4">
                    <div className="text-xs uppercase text-gray-500 mb-2">Per tab</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(summary.tabs).map(([label, count]) => (
                            <span key={label} className="px-2 py-1 bg-gray-100 rounded">{label}: {count}</span>
                        ))}
                    </div>
                </div>

                <form onSubmit={commit}>
                    <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                    <th className="px-3 py-2 text-left">Description (sheet)</th>
                                    <th className="px-3 py-2 text-left">Type / Bucket</th>
                                    <th className="px-3 py-2 text-right">Rows</th>
                                    <th className="px-3 py-2 text-left">Action</th>
                                    <th className="px-3 py-2 text-left">Category</th>
                                    <th className="px-3 py-2 text-left">Member</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((g, idx) => {
                                    const m = mappings[idx];
                                    return (
                                        <tr key={g.key} className="border-t border-gray-100 align-top">
                                            <td className="px-3 py-2 font-medium">{g.description || <em className="text-gray-400">(blank)</em>}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">
                                                <div className="capitalize">{g.type}</div>
                                                <div>{BUCKET_LABELS[g.bucket]}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right">{g.count}</td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={m.action}
                                                    onChange={(e) => updateMapping(idx, { action: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                                >
                                                    <option value="map_existing">Map to existing</option>
                                                    <option value="import_new_category">Create new category</option>
                                                    <option value="import_uncategorized">Import uncategorized</option>
                                                    <option value="skip">Skip</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                {m.action === 'map_existing' && (
                                                    <select
                                                        value={m.mapped_category_id ?? ''}
                                                        onChange={(e) => updateMapping(idx, { mapped_category_id: e.target.value })}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                                    >
                                                        <option value="">— Choose a category —</option>
                                                        {categories.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {m.action === 'import_new_category' && (
                                                    <div className="flex flex-col gap-1">
                                                        <input
                                                            type="text"
                                                            value={m.new_category_name}
                                                            onChange={(e) => updateMapping(idx, { new_category_name: e.target.value })}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded"
                                                        />
                                                        <select
                                                            value={m.new_category_kind}
                                                            onChange={(e) => updateMapping(idx, { new_category_kind: e.target.value })}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                        >
                                                            <option value="both">Kind: Both</option>
                                                            <option value="income">Kind: Income</option>
                                                            <option value="expense">Kind: Expense</option>
                                                        </select>
                                                    </div>
                                                )}
                                                {m.action === 'import_uncategorized' && (
                                                    <span className="text-xs text-gray-400">Will be imported with no category</span>
                                                )}
                                                {m.action === 'skip' && (
                                                    <span className="text-xs text-gray-400">Will not be imported</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    value={m.mapped_member_id ?? ''}
                                                    onChange={(e) => updateMapping(idx, { mapped_member_id: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                                >
                                                    <option value="">— None —</option>
                                                    {members.map((mem) => (
                                                        <option key={mem.id} value={mem.id}>{mem.name}{mem.membership_number ? ` (#${mem.membership_number})` : ''}</option>
                                                    ))}
                                                </select>
                                                {g.suggested_member_id && (
                                                    <div className="text-xs text-gray-400 mt-1">Suggested by name match</div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelImport} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel import</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                            {submitting ? 'Committing…' : 'Commit import'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
