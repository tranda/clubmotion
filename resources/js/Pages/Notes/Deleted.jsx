import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function NotesDeleted({ notes }) {
    const restore = (id) => router.post(`/notes/${id}/restore`, {}, { preserveScroll: true });

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Deleted notes</h1>
                    <Link href="/notes" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Notes</Link>
                </div>

                {notes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">No deleted notes.</div>
                ) : (
                    <ul className="space-y-2">
                        {notes.map((n) => (
                            <li key={n.id} className="bg-white rounded-lg shadow p-4 flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-gray-900">{n.title}</h2>
                                    {n.preview && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.preview}</p>}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Deleted {n.deleted_at}{n.deleted_by ? ` by ${n.deleted_by}` : ''}
                                        {n.member ? ` · ${n.member.name}` : ''}
                                        {n.attachments_count > 0 ? ` · 📎 ${n.attachments_count}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => restore(n.id)}
                                    className="px-3 py-1.5 text-sm bg-green-50 text-green-800 rounded-lg hover:bg-green-100"
                                >
                                    Restore
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Layout>
    );
}
