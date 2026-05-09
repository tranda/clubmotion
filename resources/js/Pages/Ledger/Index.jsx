import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../Components/Layout';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const BUCKET_LABELS = { cash: 'Cash', bank: 'Bank', eur: 'EUR' };

function MultiSelectDropdown({ placeholder, options, selected, onChange }) {
    const [open, setOpen] = useState(false);
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 min-w-[140px] justify-between"
            >
                <span className={selectedSet.size ? 'text-gray-900' : 'text-gray-500'}>
                    {labelOfSelected()}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {selectedSet.size > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border-b border-gray-100"
                        >
                            Clear ({selectedSet.size})
                        </button>
                    )}
                    {options.map((opt) => {
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

function formatAmount(value, bucket) {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function blankEntry(year, month) {
    const today = new Date();
    const useToday = today.getFullYear() === Number(year) && today.getMonth() + 1 === Number(month);
    const date = useToday
        ? today.toISOString().slice(0, 10)
        : `${year}-${String(month).padStart(2, '0')}-01`;
    return {
        id: null,
        entry_date: date,
        type: 'income',
        bucket: 'cash',
        amount: '',
        description: '',
        ledger_category_id: '',
        member_id: '',
        notes: '',
    };
}

export default function LedgerIndex({
    year, month, entries, opening, closing, monthlyTotals,
    pettyCashFloat, availableYears, categories, members, filters, deletedCount,
}) {
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [pettyCashEdit, setPettyCashEdit] = useState(false);

    const entryForm = useForm(blankEntry(year, month));
    const pettyForm = useForm({ amount: pettyCashFloat ?? 0 });

    const runningBalances = useMemo(() => {
        const running = { ...opening };
        return entries.map((e) => {
            if (e.type === 'income') running[e.bucket] = (running[e.bucket] ?? 0) + Number(e.amount);
            else running[e.bucket] = (running[e.bucket] ?? 0) - Number(e.amount);
            return { ...e, balance: { ...running } };
        });
    }, [entries, opening]);

    const filteredTotals = useMemo(() => {
        let income = 0;
        let expense = 0;
        for (const e of entries) {
            if (e.type === 'income') income += Number(e.amount);
            else if (e.type === 'expense') expense += Number(e.amount);
        }
        return { income, expense };
    }, [entries]);

    const typeFilter = filters?.type ?? [];
    const bucketFilter = filters?.bucket ?? [];
    const categoryFilter = (filters?.category_id ?? []).map(String);

    const navigate = (newYear, newMonth) => {
        router.get('/ledger', { year: newYear, month: newMonth, ...activeFilterParams() }, { preserveState: false });
    };

    const activeFilterParams = () => {
        const out = {};
        if (typeFilter.length) out.type = typeFilter;
        if (bucketFilter.length) out.bucket = bucketFilter;
        if (categoryFilter.length) out.category_id = categoryFilter;
        return out;
    };

    const setFilterArray = (key, values) => {
        const params = { year, month, ...activeFilterParams() };
        if (values.length) params[key] = values;
        else delete params[key];
        router.get('/ledger', params, { preserveState: true, preserveScroll: true });
    };

    const filtersActive = typeFilter.length > 0 || bucketFilter.length > 0 || categoryFilter.length > 0;

    const clearFilters = () => {
        router.get('/ledger', { year, month }, { preserveState: false });
    };

    const openCreate = () => {
        entryForm.setData(blankEntry(year, month));
        setEditing(null);
        setShowForm(true);
    };

    const openEdit = (entry) => {
        entryForm.setData({
            id: entry.id,
            entry_date: entry.entry_date,
            type: entry.type,
            bucket: entry.bucket,
            amount: entry.amount,
            description: entry.description,
            ledger_category_id: entry.category?.id ?? '',
            member_id: entry.member?.id ?? '',
            notes: entry.notes ?? '',
        });
        setEditing(entry);
        setShowForm(true);
    };

    const submitEntry = (e) => {
        e.preventDefault();
        const payload = { ...entryForm.data };
        if (payload.ledger_category_id === '') payload.ledger_category_id = null;
        if (payload.member_id === '') payload.member_id = null;
        if (editing) {
            entryForm.transform(() => payload);
            entryForm.put(`/ledger/entries/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => { setShowForm(false); setEditing(null); },
            });
        } else {
            entryForm.transform(() => payload);
            entryForm.post('/ledger/entries', {
                preserveScroll: true,
                onSuccess: () => { setShowForm(false); },
            });
        }
    };

    const deleteEntry = (entry) => {
        if (!window.confirm('Delete this entry? You can restore it later.')) return;
        router.delete(`/ledger/entries/${entry.id}`, { preserveScroll: true });
    };

    const submitPetty = (e) => {
        e.preventDefault();
        pettyForm.put('/ledger/petty-cash', {
            preserveScroll: true,
            onSuccess: () => setPettyCashEdit(false),
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">Ledger</h1>
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={year}
                            onChange={(e) => navigate(Number(e.target.value), month)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                            {!availableYears.includes(Number(year)) && <option value={year}>{year}</option>}
                        </select>
                        <select
                            value={month}
                            onChange={(e) => navigate(year, Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <Link
                            href="/ledger/categories"
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Categories
                        </Link>
                        <Link
                            href={`/ledger/reports/annual?year=${year}`}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Reports
                        </Link>
                        <Link
                            href="/ledger/import"
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Import
                        </Link>
                        <a
                            href={`/ledger/export/${year}/${month}`}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Export
                        </a>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {['cash', 'bank', 'eur'].map((b) => (
                        <div key={b} className="bg-white rounded-lg shadow p-4">
                            <div className="text-xs uppercase text-gray-500 font-semibold">{BUCKET_LABELS[b]}</div>
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                <div className="text-gray-600">Opening</div>
                                <div className="text-right tabular-nums">{formatAmount(opening[b])}</div>
                                <div className="text-green-700">Income</div>
                                <div className="text-right tabular-nums text-green-700">+{formatAmount(monthlyTotals.income[b])}</div>
                                <div className="text-red-700">Expenses</div>
                                <div className="text-right tabular-nums text-red-700">-{formatAmount(monthlyTotals.expense[b])}</div>
                                <div className="font-semibold border-t border-gray-100 pt-1">Closing</div>
                                <div className="text-right font-semibold tabular-nums border-t border-gray-100 pt-1">{formatAmount(closing[b])}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Petty cash float */}
                <div className="mb-4 bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="text-xs uppercase text-gray-500 font-semibold">Petty cash float (kusur)</div>
                        <div className="text-lg font-semibold tabular-nums">{formatAmount(pettyCashFloat)} RSD</div>
                    </div>
                    {!pettyCashEdit ? (
                        <button
                            onClick={() => setPettyCashEdit(true)}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Edit
                        </button>
                    ) : (
                        <form onSubmit={submitPetty} className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pettyForm.data.amount}
                                onChange={(e) => pettyForm.setData('amount', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                            />
                            <button type="submit" disabled={pettyForm.processing} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">
                                Save
                            </button>
                            <button type="button" onClick={() => { pettyForm.reset(); setPettyCashEdit(false); }} className="px-3 py-2 text-sm bg-gray-100 rounded-lg">
                                Cancel
                            </button>
                        </form>
                    )}
                </div>

                {/* Filters */}
                <div className="mb-3 bg-white rounded-lg shadow p-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase text-gray-500 font-semibold mr-1">Filter</span>
                    <MultiSelectDropdown
                        placeholder="All types"
                        options={[
                            { value: 'income', label: 'Income' },
                            { value: 'expense', label: 'Expenses' },
                        ]}
                        selected={typeFilter}
                        onChange={(vals) => setFilterArray('type', vals)}
                    />
                    <MultiSelectDropdown
                        placeholder="All buckets"
                        options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'bank', label: 'Bank' },
                            { value: 'eur', label: 'EUR' },
                        ]}
                        selected={bucketFilter}
                        onChange={(vals) => setFilterArray('bucket', vals)}
                    />
                    <MultiSelectDropdown
                        placeholder="All categories"
                        options={[
                            { value: 'none', label: '— Uncategorized —' },
                            ...categories.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                        selected={categoryFilter}
                        onChange={(vals) => setFilterArray('category_id', vals)}
                    />
                    {filtersActive && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:underline ml-2"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Action bar */}
                <div className="mb-3 flex justify-between items-center">
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                        <span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}{filtersActive ? ' (filtered)' : ''}</span>
                        {deletedCount > 0 && (
                            <Link
                                href={`/ledger/deleted/${year}/${month}`}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {deletedCount} deleted →
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Clear all opening-balance seeds? Use this if balances are showing even though no entries exist. The next import will re-seed them from the XLSX.')) {
                                    router.post('/ledger/opening-balances/reset');
                                }
                            }}
                            className="text-xs text-red-700 hover:underline"
                        >
                            Reset opening balances
                        </button>
                    </div>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        + Add entry
                    </button>
                </div>

                {/* Entries table */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-left">Member</th>
                                <th className="px-3 py-2 text-left">Category</th>
                                <th className="px-3 py-2 text-right">Income</th>
                                <th className="px-3 py-2 text-right">Expense</th>
                                <th className="px-3 py-2 text-left">Bucket</th>
                                <th className="px-3 py-2 text-right">Balance ({BUCKET_LABELS.cash}/{BUCKET_LABELS.bank}/{BUCKET_LABELS.eur})</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runningBalances.length === 0 && (
                                <tr><td colSpan="9" className="px-3 py-6 text-center text-gray-400">No entries yet for {MONTHS[month - 1]} {year}.</td></tr>
                            )}
                            {runningBalances.map((e) => (
                                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap">{e.entry_date_display}</td>
                                    <td className="px-3 py-2">
                                        {e.description}
                                        {e.source === 'import' && (
                                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">imported</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">{e.member?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-gray-600">{e.category?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">
                                        {e.type === 'income' ? formatAmount(e.amount) : ''}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">
                                        {e.type === 'expense' ? formatAmount(e.amount) : ''}
                                    </td>
                                    <td className="px-3 py-2">{BUCKET_LABELS[e.bucket]}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-500">
                                        {formatAmount(e.balance.cash)} / {formatAmount(e.balance.bank)} / {formatAmount(e.balance.eur)}
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <button onClick={() => openEdit(e)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 mr-1">Edit</button>
                                        <button onClick={() => deleteEntry(e)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {entries.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                                    <td colSpan="4" className="px-3 py-2 text-right uppercase text-xs text-gray-600">Total</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{formatAmount(filteredTotals.income)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{formatAmount(filteredTotals.expense)}</td>
                                    <td colSpan="3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Add/edit form modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit entry' : 'Add entry'}</h2>
                            <form onSubmit={submitEntry} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
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
                                        <label className="block text-xs text-gray-600 mb-1">Type</label>
                                        <select
                                            value={entryForm.data.type}
                                            onChange={(e) => entryForm.setData('type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="income">Income</option>
                                            <option value="expense">Expense</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Bucket</label>
                                        <select
                                            value={entryForm.data.bucket}
                                            onChange={(e) => entryForm.setData('bucket', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="cash">Cash (keš)</option>
                                            <option value="bank">Bank (račun)</option>
                                            <option value="eur">EUR (evri)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Amount</label>
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
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={255}
                                        value={entryForm.data.description}
                                        onChange={(e) => entryForm.setData('description', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Category (optional)</label>
                                    <select
                                        value={entryForm.data.ledger_category_id ?? ''}
                                        onChange={(e) => entryForm.setData('ledger_category_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">— Uncategorized —</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Member (optional, e.g. monthly membership)</label>
                                    <select
                                        value={entryForm.data.member_id ?? ''}
                                        onChange={(e) => entryForm.setData('member_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="">— None —</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>{m.name}{m.membership_number ? ` (#${m.membership_number})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Notes</label>
                                    <textarea
                                        rows="2"
                                        value={entryForm.data.notes ?? ''}
                                        onChange={(e) => entryForm.setData('notes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                {Object.keys(entryForm.errors).length > 0 && (
                                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                        {Object.values(entryForm.errors).map((err, i) => <div key={i}>{err}</div>)}
                                    </div>
                                )}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={entryForm.processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                                        {editing ? 'Save changes' : 'Add entry'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
