import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../../Components/Layout';

export default function NotesIndex({ notes, members, filters, deletedCount }) {
    const [q, setQ] = useState(filters.q || '');
    const [memberId, setMemberId] = useState(filters.member_id || '');
    const first = useRef(true);

    // Search as you type (short delay), keep the member filter.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => {
            const params = {};
            if (q.trim()) params.q = q.trim();
            if (memberId) params.member_id = memberId;
            router.get('/notes', params, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);
        return () => clearTimeout(t);
    }, [q, memberId]);

    const filtersActive = !!(filters.q || filters.member_id);
    const newHref = memberId ? `/notes/create?member_id=${memberId}` : '/notes/create';

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Notes</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        {deletedCount > 0 && (
                            <Link
                                href="/notes/deleted"
                                className="px-3 py-2 text-sm bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100"
                            >
                                Deleted ({deletedCount})
                            </Link>
                        )}
                        <Link href={newHref} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            + New note
                        </Link>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search title and text…"
                        aria-label="Search notes"
                        className="flex-1 min-w-[12rem] px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                    />
                    <select
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        aria-label="Filter by member"
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white min-w-[12rem]"
                    >
                        <option value="">All members</option>
                        {members.map((m) => (
                            <option key={m.id} value={String(m.id)}>{m.name}{m.is_active ? '' : ' (inactive)'}</option>
                        ))}
                    </select>
                </div>

                {notes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
                        {filtersActive ? 'No notes match the search.' : 'No notes yet. Notes are shared by all admins and superusers.'}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {notes.map((n) => (
                            <li key={n.id}>
                                <Link
                                    href={`/notes/${n.id}`}
                                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <h2 className="font-semibold text-gray-900">{n.title}</h2>
                                        <span className="text-xs text-gray-500">
                                            {n.updated_at}{n.updated_by ? ` · ${n.updated_by}` : ''}
                                        </span>
                                    </div>
                                    {n.preview && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.preview}</p>}
                                    {(n.member || n.attachments_count > 0) && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                            {n.member && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{n.member.name}</span>
                                            )}
                                            {n.attachments_count > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                    📎 {n.attachments_count}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Layout>
    );
}
