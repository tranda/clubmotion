import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';

export default function NoteCategories({ categories }) {
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const form = useForm({ name: '', is_active: true, sort_order: 0 });

    const startEdit = (cat) => {
        setEditing(cat);
        form.setData({
            name: cat.name,
            is_active: !!cat.is_active,
            sort_order: cat.sort_order ?? 0,
        });
    };

    const cancel = () => {
        setEditing(null);
        form.reset();
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(`/notes/categories/${editing.id}`, {
                preserveScroll: true,
                onSuccess: cancel,
            });
        } else {
            form.post('/notes/categories', {
                preserveScroll: true,
                onSuccess: () => form.reset(),
            });
        }
    };

    const remove = (cat) => setConfirmDelete(cat);

    const confirmRemove = () => {
        if (!confirmDelete) return;
        const id = confirmDelete.id;
        setConfirmDelete(null);
        router.delete(`/notes/categories/${id}`, { preserveScroll: true });
    };

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Note categories</h1>
                    <Link href="/notes" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Notes</Link>
                </div>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-4 mb-4">
                    <h2 className="text-sm font-semibold text-gray-600 mb-3">{editing ? `Edit "${editing.name}"` : 'Add category'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Sort order</label>
                            <input
                                type="number"
                                value={form.data.sort_order}
                                onChange={(e) => form.setData('sort_order', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={!!form.data.is_active}
                                onChange={(e) => form.setData('is_active', e.target.checked)}
                            />
                            Active
                        </label>
                        <div className="flex-1"></div>
                        {editing && (
                            <button type="button" onClick={cancel} className="px-3 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
                        )}
                        <button type="submit" disabled={form.processing} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
                            {editing ? 'Save' : 'Add'}
                        </button>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {Object.values(form.errors).map((err, i) => <div key={i}>{err}</div>)}
                        </div>
                    )}
                </form>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-right">Notes</th>
                                <th className="px-3 py-2 text-right">Sort</th>
                                <th className="px-3 py-2 text-left">Active</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 && (
                                <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400">No categories yet.</td></tr>
                            )}
                            {categories.map((c) => (
                                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2">{c.name}</td>
                                    <td className="px-3 py-2 text-right">{c.notes_count ?? 0}</td>
                                    <td className="px-3 py-2 text-right">{c.sort_order}</td>
                                    <td className="px-3 py-2">{c.is_active ? 'Yes' : 'No'}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        <button onClick={() => startEdit(c)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 mr-1">Edit</button>
                                        <button onClick={() => remove(c)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                open={!!confirmDelete}
                title="Delete category?"
                danger
                confirmLabel="Delete"
                message={confirmDelete && (
                    <>Delete category <span className="font-semibold">"{confirmDelete.name}"</span>? Existing notes will keep their reference (just lose the category link).</>
                )}
                onConfirm={confirmRemove}
                onCancel={() => setConfirmDelete(null)}
            />
        </Layout>
    );
}
