import { Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';
import { formatSize } from '../../Components/Trainings/shared';

export default function TrainingEdit({ training, defaultType, defaultDate = '', limits }) {
    const isNew = !training;
    const fileInput = useRef(null);
    const [fileError, setFileError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const form = useForm({
        type: training?.type || defaultType || 'water',
        title: training?.title || '',
        training_date: training ? (training.date || '') : defaultDate,
        description: training?.description || '',
        files: [],
        remove_file_ids: [],
    });
    const { data, setData, errors, processing, progress } = form;

    const keptFiles = (training?.files || []).filter((f) => !data.remove_file_ids.includes(f.id));
    const removedFiles = (training?.files || []).filter((f) => data.remove_file_ids.includes(f.id));

    const addFiles = (list) => {
        setFileError('');
        const picked = Array.from(list || []);
        const allowed = new Set(limits.extensions);
        const ok = [];
        const problems = [];
        for (const f of picked) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (!allowed.has(ext)) problems.push(`${f.name}: file type not allowed`);
            else if (limits.file_bytes && f.size > limits.file_bytes) problems.push(`${f.name}: larger than ${formatSize(limits.file_bytes)}`);
            else ok.push(f);
        }
        if (problems.length) setFileError(problems.join(' · '));
        if (ok.length) setData('files', [...data.files, ...ok]);
        if (fileInput.current) fileInput.current.value = '';
    };

    const newBytes = data.files.reduce((sum, f) => sum + f.size, 0);
    const tooBig = limits.total_bytes && newBytes > limits.total_bytes * 0.95;
    const tooMany = limits.max_files && data.files.length > limits.max_files;

    const submit = (e) => {
        e.preventDefault();
        if (tooBig || tooMany) return;
        if (isNew) {
            form.post('/trainings', { forceFormData: true });
        } else {
            form.transform((d) => ({ ...d, _method: 'put' }));
            form.post(`/trainings/${training.id}`, { forceFormData: true });
        }
    };

    const fileErrors = Object.entries(errors).filter(([k]) => k.startsWith('files')).map(([, v]) => v);

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <div className="mb-3">
                    <Link href={isNew ? '/trainings' : `/trainings/${training.id}`} className="text-sm text-blue-600 hover:underline">
                        ← {isNew ? 'Trainings' : 'Back to training'}
                    </Link>
                </div>
                <h1 className="mb-4 text-2xl font-bold text-gray-800">{isNew ? 'New training' : 'Edit training'}</h1>

                <form onSubmit={submit} className="bg-white rounded-lg shadow p-5 space-y-4">
                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Type</span>
                        <div className="inline-flex rounded-lg bg-gray-100 p-1">
                            {[['water', '🚣 Water'], ['gym', '🏋️ Gym']].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setData('type', value)}
                                    aria-pressed={data.type === value}
                                    className={`px-4 py-1.5 text-sm rounded-md ${
                                        data.type === value ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-1">Title</span>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                maxLength={200}
                                required
                                placeholder="e.g. Intervals 8×500 m"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-1">Date</span>
                            <input
                                type="date"
                                value={data.training_date}
                                onChange={(e) => setData('training_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <span className="mt-1 block text-xs text-gray-500">Leave empty for a general program.</span>
                            {errors.training_date && <p className="mt-1 text-sm text-red-600">{errors.training_date}</p>}
                        </label>
                    </div>

                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={8}
                            placeholder="Warm-up, main set, cool-down…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </label>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Files</span>

                        {(keptFiles.length > 0 || data.files.length > 0) && (
                            <ul className="mb-2 divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                {keptFiles.map((f) => (
                                    <FileRow
                                        key={`old-${f.id}`}
                                        name={f.name}
                                        size={f.size}
                                        onRemove={() => setData('remove_file_ids', [...data.remove_file_ids, f.id])}
                                    />
                                ))}
                                {data.files.map((f, i) => (
                                    <FileRow
                                        key={`new-${i}`}
                                        name={f.name}
                                        size={f.size}
                                        isNew
                                        onRemove={() => setData('files', data.files.filter((_, j) => j !== i))}
                                    />
                                ))}
                            </ul>
                        )}

                        {removedFiles.length > 0 && (
                            <p className="mb-2 text-xs text-gray-500">
                                Will be removed on save: {removedFiles.map((f) => f.name).join(', ')}{' '}
                                <button
                                    type="button"
                                    onClick={() => setData('remove_file_ids', [])}
                                    className="text-blue-600 hover:underline"
                                >
                                    Undo
                                </button>
                            </p>
                        )}

                        <label
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50"
                        >
                            <input
                                ref={fileInput}
                                type="file"
                                multiple
                                accept={limits.extensions.map((x) => `.${x}`).join(',')}
                                onChange={(e) => addFiles(e.target.files)}
                                className="sr-only"
                            />
                            <span className="font-medium text-blue-600">Add files</span>
                            <span className="text-xs text-gray-500">
                                PDF, images, Word/Excel, video · up to {formatSize(limits.file_bytes)} each
                            </span>
                        </label>

                        {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
                        {tooBig && (
                            <p className="mt-1 text-sm text-red-600">
                                The new files together are larger than the server accepts in one save ({formatSize(limits.total_bytes)}).
                                Save fewer files at a time.
                            </p>
                        )}
                        {tooMany && (
                            <p className="mt-1 text-sm text-red-600">
                                The server accepts at most {limits.max_files} files in one save.
                            </p>
                        )}
                        {fileErrors.map((msg, i) => <p key={i} className="mt-1 text-sm text-red-600">{msg}</p>)}
                    </div>

                    {progress && (
                        <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress.percentage || 0}%` }} />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={processing || tooBig || tooMany}
                            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                            {processing ? 'Saving…' : 'Save'}
                        </button>
                        {!isNew && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="px-4 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                Delete training
                            </button>
                        )}
                    </div>
                </form>

                {!isNew && (
                    <ConfirmModal
                        open={confirmDelete}
                        title="Delete training?"
                        message={<>“{training.title}” will no longer be visible to members.</>}
                        confirmLabel="Delete"
                        danger
                        onConfirm={() => { setConfirmDelete(false); router.delete(`/trainings/${training.id}`); }}
                        onCancel={() => setConfirmDelete(false)}
                    />
                )}
            </div>
        </Layout>
    );
}

function FileRow({ name, size, isNew, onRemove }) {
    return (
        <li className="flex items-center gap-3 p-2.5 text-sm">
            <span aria-hidden>{name.toLowerCase().endsWith('.pdf') ? '📄' : '📎'}</span>
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {isNew && <span className="text-xs text-green-700">new</span>}
            <span className="text-xs text-gray-500">{formatSize(size)}</span>
            <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${name}`}>
                ✕
            </button>
        </li>
    );
}
