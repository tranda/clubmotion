import { Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Layout from '../../Components/Layout';
import ExerciseModal from '../../Components/Trainings/ExerciseModal';

// Exercise library: every exercise once, with its illustration, muscles and how to do it.
export default function Exercises({ exercises }) {
    const { auth } = usePage().props;
    const role = auth.user?.role?.name || 'user';
    const canManage = role === 'admin' || role === 'superuser';
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);

    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return exercises;
        return exercises.filter((e) => `${e.name} ${e.muscles || ''}`.toLowerCase().includes(needle));
    }, [q, exercises]);

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Exercises</h1>
                    {canManage && (
                        <Link href="/trainings/exercises/create" className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            + New exercise
                        </Link>
                    )}
                </div>

                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by name or muscle…"
                    aria-label="Search exercises"
                    className="mb-4 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />

                {shown.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
                        {exercises.length === 0 ? 'No exercises yet.' : 'No exercise matches the search.'}
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {shown.map((e, i) => (
                            <li key={e.id} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpen(i)}
                                    className="block w-full overflow-hidden rounded-lg bg-white text-left shadow hover:shadow-md transition-shadow"
                                >
                                    <span className="flex aspect-square items-center justify-center bg-white p-2">
                                        {e.image_url
                                            ? <img src={e.image_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                                            : <span className="text-4xl" aria-hidden>🏋️</span>}
                                    </span>
                                    <span className="block border-t border-gray-100 p-2">
                                        <span className="block text-sm font-medium leading-snug text-gray-900">{e.name}</span>
                                        {e.muscles && <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">{e.muscles}</span>}
                                    </span>
                                </button>
                                {canManage && (
                                    <Link
                                        href={`/trainings/exercises/${e.id}/edit`}
                                        className="absolute right-1.5 top-1.5 rounded-md bg-white/90 px-2 py-0.5 text-xs text-gray-700 shadow hover:bg-gray-100"
                                    >
                                        Edit
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {open !== null && shown[open] && (
                <ExerciseModal items={shown} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
            )}
        </Layout>
    );
}
