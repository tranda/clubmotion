import { useEffect, useMemo, useRef, useState } from 'react';

// Lowercase without diacritics, so "zivko" finds "Živko" and "dorde" finds "Đorđe".
const fold = (s) => (s || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Single member picker with a search field. value = member id or null.
export default function MemberSelect({ members, value, onChange, placeholder = 'Select member' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        inputRef.current?.focus();
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const results = useMemo(() => {
        const q = fold(query.trim());
        return members.filter((m) => !q || fold(m.name).includes(q) || String(m.membership_number ?? '') === q).slice(0, 100);
    }, [members, query]);
    useEffect(() => setActive(0), [query]);

    const selected = value ? members.find((m) => m.id === Number(value)) : null;
    const pick = (id) => { onChange(id); setOpen(false); setQuery(''); };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active].id); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm text-left focus:border-blue-500 focus:ring-blue-500"
            >
                <span className={selected ? 'text-gray-900' : 'text-gray-500'}>{selected ? selected.name : placeholder}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {open && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Search member…"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1">
                        <li>
                            <button type="button" onClick={() => pick(null)} className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">
                                {placeholder}
                            </button>
                        </li>
                        {results.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">No matches</li>}
                        {results.map((m, i) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => pick(m.id)}
                                    onMouseEnter={() => setActive(i)}
                                    className={`w-full text-left px-3 py-1.5 text-sm ${i === active ? 'bg-blue-50' : ''} ${m.id === selected?.id ? 'font-semibold' : ''} ${m.is_active === false || m.is_active === 0 ? 'text-gray-400' : 'text-gray-900'}`}
                                >
                                    {m.name}
                                    {m.membership_number && <span className="ml-1 text-xs text-gray-400">#{m.membership_number}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
