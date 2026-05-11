import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';

function MultiSelectDropdown({ placeholder, options, selected, onChange, searchable = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const selectedSet = new Set(selected.map(String));
    const toggle = (value) => {
        const v = String(value);
        const next = selectedSet.has(v)
            ? selected.map(String).filter((x) => x !== v)
            : [...selected.map(String), v];
        onChange(next);
    };

    const filtered = searchable && query
        ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
        : options;

    const labelOfSelected = () => {
        if (selectedSet.size === 0) return placeholder;
        if (selectedSet.size === 1) {
            const opt = options.find((o) => String(o.value) === [...selectedSet][0]);
            return opt?.label ?? placeholder;
        }
        return `${selectedSet.size} selected`;
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[160px] justify-between"
            >
                <span className={selectedSet.size ? 'text-gray-900' : 'text-gray-500'}>
                    {labelOfSelected()}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-20 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search…"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                        </div>
                    )}
                    {selectedSet.size > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-b border-gray-100"
                        >
                            Clear ({selectedSet.size})
                        </button>
                    )}
                    {filtered.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
                    )}
                    {filtered.map((opt) => {
                        const checked = selectedSet.has(String(opt.value));
                        return (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(opt.value)}
                                />
                                <span>{opt.label}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function formatAmount(value) {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function blankEntry() {
    return {
        id: null,
        entry_date: new Date().toISOString().slice(0, 10),
        member_id: '',
        note_category_id: '',
        amount: '',
        description: '',
    };
}

export default function NotesIndex({
    entries, totalAmount, categories, members, filters, deletedCount,
}) {
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const entryForm = useForm(blankEntry());

    const memberFilter = (filters?.member_id ?? []).map(String);
    const categoryFilter = (filters?.category_id ?? []).map(String);

    const activeFilterParams = () => {
        const out = {};
        if (memberFilter.length) out.member_id = memberFilter;
        if (categoryFilter.length) out.category_id = categoryFilter;
        return out;
    };

    const setFilterArray = (key, values) => {
        const params = { ...activeFilterParams() };
        if (values.length) params[key] = values;
        else delete params[key];
        router.get('/notes', params, { preserveState: true, preserveScroll: true });
    };

    const filtersActive = memberFilter.length > 0 || categoryFilter.length > 0;

    const clearFilters = () => {
        router.get('/notes', {}, { preserveState: false });
    };

    const openCreate = () => {
        entryForm.setData(blankEntry());
        setEditing(null);
        setShowForm(true);
    };

    const openEdit = (entry) => {
        entryForm.setData({
            id: entry.id,
            entry_date: entry.entry_date,
            member_id: entry.member?.id ?? '',
            note_category_id: entry.category?.id ?? '',
            amount: entry.amount,
            description: entry.description ?? '',
        });
        setEditing(entry);
        setShowForm(true);
    };

    const closeForm = () => {
        entryForm.reset();
        entryForm.clearErrors();
        setEditing(null);
        setShowForm(false);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            entryForm.put(`/notes/entries/${editing.id}`, {
                preserveScroll: true,
                onSuccess: closeForm,
            });
        } else {
            entryForm.post('/notes/entries', {
                preserveScroll: true,
                onSuccess: closeForm,
            });
        }
    };

    const remove = (entry) => setConfirmDelete(entry);

    const confirmRemove = () => {
        if (!confirmDelete) return;
        const id = confirmDelete.id;
        setConfirmDelete(null);
        router.delete(`/notes/entries/${id}`, { preserveScroll: true });
    };

    const memberOptions = useMemo(
        () => members.map((m) => ({ value: m.id, label: m.name })),
        [members]
    );
    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.id, label: c.name })),
        [categories]
    );

    return (
        <Layout>
            <div className="py-4 max-w-6xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Notes</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/notes/categories"
                            className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Manage categories
                        </Link>
                        {deletedCount > 0 && (
                            <Link
                                href="/notes/deleted"
                                className="px-3 py-2 text-sm bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100"
                            >
                                Deleted ({deletedCount})
                            </Link>
                        )}
                        <button
                            onClick={openCreate}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add note
                        </button>
                    </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">Filters:</span>
                    <MultiSelectDropdown
                        placeholder="All members"
                        options={memberOptions}
                        selected={memberFilter}
                        onChange={(v) => setFilterArray('member_id', v)}
                        searchable
                    />
                    <MultiSelectDropdown
                        placeholder="All categories"
                        options={categoryOptions}
                        selected={categoryFilter}
                        onChange={(v) => setFilterArray('category_id', v)}
                    />
                    {filtersActive && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-4">
                        <h2 className="text-sm font-semibold text-gray-600 mb-3">
                            {editing ? 'Edit note' : 'Add note'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={entryForm.data.entry_date}
                                    onChange={(e) => entryForm.setData('entry_date', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Member *</label>
                                <select
                                    required
                                    value={entryForm.data.member_id}
                                    onChange={(e) => entryForm.setData('member_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">— select —</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Category *</label>
                                <select
                                    required
                                    value={entryForm.data.note_category_id}
                                    onChange={(e) => entryForm.setData('note_category_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">— select —</option>
                                    {categories.filter((c) => c.is_active || c.id === entryForm.data.note_category_id).map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={entryForm.data.amount}
                                    onChange={(e) => entryForm.setData('amount', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs text-gray-600 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={entryForm.data.description}
                                    onChange={(e) => entryForm.setData('description', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="px-3 py-2 text-sm bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={entryForm.processing}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg"
                            >
                                {editing ? 'Save' : 'Add'}
                            </button>
                        </div>
                        {Object.keys(entryForm.errors).length > 0 && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                {Object.values(entryForm.errors).map((err, i) => <div key={i}>{err}</div>)}
                            </div>
                        )}
                    </form>
                )}

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
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
                                <tr>
                                    <td colSpan="6" className="px-3 py-6 text-center text-gray-400">
                                        {filtersActive ? 'No notes match the current filters.' : 'No notes yet.'}
                                    </td>
                                </tr>
                            )}
                            {entries.map((e) => (
                                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap">{e.entry_date_display}</td>
                                    <td className="px-3 py-2">{e.member?.name ?? <span className="text-gray-400">—</span>}</td>
                                    <td className="px-3 py-2">{e.category?.name ?? <span className="text-gray-400">—</span>}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(e.amount)}</td>
                                    <td className="px-3 py-2 text-gray-600">{e.description}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => openEdit(e)}
                                            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 mr-1"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => remove(e)}
                                            className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {entries.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                                    <td colSpan="3" className="px-3 py-2 text-right text-gray-600 uppercase text-xs">
                                        Total ({entries.length})
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(totalAmount)}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {entries.length > 10 && (
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={openCreate}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add note
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={!!confirmDelete}
                title="Delete note?"
                danger
                confirmLabel="Delete"
                message={confirmDelete && (
                    <>
                        Delete this note?
                        <div className="mt-2 text-xs text-gray-500">
                            {confirmDelete.entry_date_display}
                            {confirmDelete.member ? ` · ${confirmDelete.member.name}` : ''}
                            {confirmDelete.category ? ` · ${confirmDelete.category.name}` : ''}
                            {' · '}{formatAmount(confirmDelete.amount)}
                        </div>
                    </>
                )}
                onConfirm={confirmRemove}
                onCancel={() => setConfirmDelete(null)}
            />
        </Layout>
    );
}
