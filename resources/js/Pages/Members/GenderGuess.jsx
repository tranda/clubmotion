import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

// Review guessed genders (from first names) for members without one, then save.
export default function GenderGuess({ rows }) {
    const [genders, setGenders] = useState(() => Object.fromEntries(rows.map((r) => [r.id, r.guess || ''])));
    const [processing, setProcessing] = useState(false);
    const set = (id, value) => setGenders((g) => ({ ...g, [id]: value }));
    const count = Object.values(genders).filter(Boolean).length;
    const unsure = rows.filter((r) => !r.sure).length;

    const save = () => {
        setProcessing(true);
        router.post('/members/gender-guess', { genders }, { onFinish: () => setProcessing(false) });
    };

    const options = [['M', 'Male'], ['F', 'Female'], ['', 'Skip']];

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <Link href="/members" className="text-sm text-blue-600 hover:text-blue-800">← Members</Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-800">Fill gender from names</h1>
                <p className="text-sm text-gray-600 mb-4">
                    Guessed from the first name for the {rows.length} member(s) without a gender. Correct any mistakes, then save.
                    Members that already have a gender are not changed.
                    {unsure > 0 && <span className="text-amber-700"> {unsure} name(s) are unsure (highlighted).</span>}
                </p>

                {rows.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Every member already has a gender.</div>
                ) : (
                    <>
                        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
                            {rows.map((r) => (
                                <div key={r.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 ${r.sure ? '' : 'bg-amber-50'}`}>
                                    <div className={r.is_active ? 'text-gray-900' : 'text-gray-400'}>
                                        {r.name}
                                        <span className="ml-2 text-xs text-gray-400">#{r.membership_number}</span>
                                        {!r.sure && <span className="ml-2 text-xs text-amber-700">unsure</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        {options.map(([value, label]) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => set(r.id, value)}
                                                className={`px-3 py-1 rounded-md text-sm border ${genders[r.id] === value
                                                    ? (value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-600 border-gray-600 text-white')
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={save}
                                disabled={processing || count === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Save gender for {count} member(s)
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
