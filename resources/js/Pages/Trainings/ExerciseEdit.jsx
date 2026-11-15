import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';

export default function ExerciseEdit({ exercise }) {
    const isNew = !exercise;
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [preview, setPreview] = useState(exercise?.image_url || null);
    const form = useForm({
        name: exercise?.name || '',
        muscles: exercise?.muscles || '',
        how_to: exercise?.how_to || '',
        image: null,
        remove_image: false,
    });
    const { data, setData, errors, processing } = form;

    useEffect(() => {
        if (!data.image) return undefined;
        const url = URL.createObjectURL(data.image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [data.image]);

    const submit = (e) => {
        e.preventDefault();
        if (isNew) {
            form.post('/trainings/exercises', { forceFormData: true });
        } else {
            form.transform((d) => ({ ...d, remove_image: d.remove_image ? 1 : 0, _method: 'put' }));
            form.post(`/trainings/exercises/${exercise.id}`, { forceFormData: true });
        }
    };

    return (
        <Layout>
            <div className="py-4 max-w-2xl mx-auto">
                <div className="mb-3">
                    <Link href="/trainings/exercises" className="text-sm text-blue-600 hover:underline">← Exercises</Link>
                </div>
                <h1 className="mb-4 text-2xl font-bold text-gray-800">{isNew ? 'New exercise' : 'Edit exercise'}</h1>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 space-y-4">
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Name</span>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            maxLength={150}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        {!isNew && exercise.used > 0 && (
                            <p className="mt-1 text-xs text-gray-500">Used in {exercise.used} training{exercise.used === 1 ? '' : 's'}; a new name shows there too.</p>
                        )}
                    </label>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Illustration</span>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                {preview && !data.remove_image
                                    ? <img src={preview} alt="" className="h-full w-full object-contain" />
                                    : <span className="text-xs text-gray-400">No image</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="inline-block cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200">
                                    {preview ? 'Replace image' : 'Add image'}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="sr-only"
                                        onChange={(e) => { setData((d) => ({ ...d, image: e.target.files[0] || null, remove_image: false })); }}
                                    />
                                </label>
                                {preview && !data.remove_image && (
                                    <button
                                        type="button"
                                        onClick={() => { setData((d) => ({ ...d, image: null, remove_image: true })); }}
                                        className="block text-sm text-red-600 hover:underline"
                                    >
                                        Remove image
                                    </button>
                                )}
                            </div>
                        </div>
                        {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
                    </div>

                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Muscles</span>
                        <textarea
                            value={data.muscles}
                            onChange={(e) => setData('muscles', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">How to do it</span>
                        <textarea
                            value={data.how_to}
                            onChange={(e) => setData('how_to', e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                            {processing ? 'Saving…' : 'Save'}
                        </button>
                        {!isNew && exercise.used === 0 && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="px-4 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                Delete exercise
                            </button>
                        )}
                    </div>
                </form>

                {!isNew && (
                    <ConfirmModal
                        open={confirmDelete}
                        title="Delete exercise?"
                        message={<>“{exercise.name}” will be removed from the library.</>}
                        confirmLabel="Delete"
                        danger
                        onConfirm={() => { setConfirmDelete(false); router.delete(`/trainings/exercises/${exercise.id}`); }}
                        onCancel={() => setConfirmDelete(false)}
                    />
                )}
            </div>
        </Layout>
    );
}
