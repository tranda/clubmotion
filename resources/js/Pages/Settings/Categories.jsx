import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function CategoryForm({ category, onClose }) {
    const { data, setData, post, put, processing, errors } = useForm({
        category_name: category?.category_name ?? '',
        description: category?.description ?? '',
        is_age_based: category?.is_age_based ?? false,
        min_age: category?.min_age ?? '',
        max_age: category?.max_age ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onClose() };
        if (category) put(`/settings/categories/${category.id}`, options);
        else post('/settings/categories', options);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">{category ? 'Edit category' : 'Add category'}</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input value={data.category_name} onChange={(e) => setData('category_name', e.target.value)} required className={inputClass} />
                    {errors.category_name && <p className="mt-1 text-sm text-red-600">{errors.category_name}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input value={data.description} onChange={(e) => setData('description', e.target.value)} className={inputClass} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.is_age_based} onChange={(e) => setData('is_age_based', e.target.checked)} />
                    Age-based (assigned automatically from date of birth)
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min age</label>
                        <input type="number" min="0" max="150" value={data.min_age} onChange={(e) => setData('min_age', e.target.value)} className={inputClass} />
                        {errors.min_age && <p className="mt-1 text-sm text-red-600">{errors.min_age}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max age</label>
                        <input type="number" min="0" max="150" value={data.max_age} onChange={(e) => setData('max_age', e.target.value)} className={inputClass} />
                        {errors.max_age && <p className="mt-1 text-sm text-red-600">{errors.max_age}</p>}
                    </div>
                </div>
                {data.is_age_based && (
                    <p className="text-xs text-gray-500">
                        Age is the age reached this calendar year (IDBF rule). Members are placed in the narrowest age-based category that fits; changes apply the next time the Members list is opened.
                    </p>
                )}
                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={processing} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        Save
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// Settings → Member categories: names and age ranges.
export default function Categories({ categories }) {
    const [editing, setEditing] = useState(null); // category, 'new' or null

    const remove = (c) => {
        if (!confirm(`Delete category "${c.category_name}"?`)) return;
        router.delete(`/settings/categories/${c.id}`, { preserveScroll: true });
    };

    const ages = (c) => {
        if (c.min_age == null && c.max_age == null) return '—';
        if (c.max_age == null) return `${c.min_age}+`;
        return `${c.min_age ?? 0}–${c.max_age}`;
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto py-6">
                <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-800">← Settings</Link>
                <div className="mt-2 mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Member categories</h1>
                        <p className="text-sm text-gray-600">IDBF categories. Age = age reached this calendar year.</p>
                    </div>
                    <button type="button" onClick={() => setEditing('new')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                        + Add category
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
                    {categories.length === 0 && <div className="p-6 text-center text-gray-500">No categories yet.</div>}
                    {categories.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                                <div className="font-medium text-gray-900">
                                    {c.category_name}
                                    {c.is_age_based && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Age {ages(c)}
                                        </span>
                                    )}
                                </div>
                                {c.description && <div className="text-sm text-gray-500">{c.description}</div>}
                                <div className="text-xs text-gray-500">
                                    {c.members} member{c.members === 1 ? '' : 's'} ({c.active_members} active)
                                    {!c.is_age_based && (c.min_age != null || c.max_age != null) && ` · ages ${ages(c)} (not age-based)`}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <button type="button" onClick={() => setEditing(c)} className="text-blue-600 hover:text-blue-800">Edit</button>
                                <button
                                    type="button"
                                    onClick={() => remove(c)}
                                    disabled={c.members > 0}
                                    title={c.members > 0 ? 'Move its members to another category first' : ''}
                                    className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {editing && <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
        </Layout>
    );
}
