import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

// Lowercase without diacritics, so "zivko" finds "Živko" and "dorde" finds "Đorđe".
const fold = (s) => (s || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Admin picker for "View as member": search members with a login and start viewing as one.
export default function ViewAsMemberModal({ onClose }) {
    const [members, setMembers] = useState(null);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        fetch('/impersonate/candidates', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(setMembers)
            .catch(() => setError('Could not load members.'));
    }, []);

    const results = useMemo(() => {
        if (!members) return [];
        const q = fold(query.trim());
        return members.filter((m) => !q || fold(m.name).includes(q) || String(m.membership_number) === q);
    }, [members, query]);

    useEffect(() => setActive(0), [query]);

    const viewAs = (m) => router.post(`/members/${m.id}/impersonate`);

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && results[active]) { e.preventDefault(); viewAs(results[active]); }
        if (e.key === 'Escape') onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[60] p-4 pt-24" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">View as member</h2>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search by name or ID…"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <ul className="max-h-[50vh] overflow-y-auto py-1">
                    {error && <li className="px-4 py-3 text-sm text-red-600">{error}</li>}
                    {!error && members === null && <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>}
                    {members && results.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">No members found.</li>}
                    {results.map((m, i) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                onClick={() => viewAs(m)}
                                onMouseEnter={() => setActive(i)}
                                className={`w-full text-left px-4 py-2 flex items-center justify-between gap-2 text-sm ${i === active ? 'bg-blue-50' : ''}`}
                            >
                                <span className={m.is_active ? 'text-gray-900' : 'text-gray-400'}>
                                    {m.name}
                                    <span className="ml-2 text-xs text-gray-400">#{m.membership_number}</span>
                                </span>
                                <span className="text-xs text-gray-500">{m.role}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="p-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                    <span>Read-only while viewing. Only members with a login.</span>
                    <button type="button" onClick={onClose} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm">Close</button>
                </div>
            </div>
        </div>
    );
}
