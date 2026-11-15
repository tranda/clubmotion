import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';
import { IMAGE_EXTENSIONS, formatSize, isImageMime } from '../../Components/Trainings/shared';

const emptyExercise = () => ({ name: '', group: 'all', sets: '', rest: '', load_women: '', load_men: '' });

export default function TrainingEdit({ training, defaultType, defaultDate = '', limits, exerciseNames = [] }) {
    const isNew = !training;
    const fileInput = useRef(null);
    const imageInput = useRef(null);
    const [fileError, setFileError] = useState('');
    const [imageError, setImageError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const form = useForm({
        type: training?.type || defaultType || 'water',
        title: training?.title || '',
        training_date: training ? (training.date || '') : defaultDate,
        description: training?.description || '',
        links: training?.links || [],
        exercises: (training?.exercises || []).map((e) => ({
            name: e.exercise?.name || '',
            group: e.group || 'all',
            sets: e.sets || '',
            rest: e.rest || '',
            load_women: e.load_women || '',
            load_men: e.load_men || '',
        })),
        exercises_sent: 1,
        images: [],
        files: [],
        remove_file_ids: [],
    });
    const { data, setData, errors, processing, progress } = form;

    const keptFiles = (training?.files || []).filter((f) => !data.remove_file_ids.includes(f.id));
    const keptImages = keptFiles.filter((f) => isImageMime(f.mime));
    const keptDocs = keptFiles.filter((f) => !isImageMime(f.mime));
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

    const addImages = (list) => {
        setImageError('');
        const ok = [];
        const problems = [];
        for (const f of Array.from(list || [])) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (!IMAGE_EXTENSIONS.includes(ext)) problems.push(`${f.name}: use JPG, PNG, GIF or WebP`);
            else if (limits.file_bytes && f.size > limits.file_bytes) problems.push(`${f.name}: larger than ${formatSize(limits.file_bytes)}`);
            else ok.push(f);
        }
        if (problems.length) setImageError(problems.join(' · '));
        if (ok.length) setData('images', [...data.images, ...ok]);
        if (imageInput.current) imageInput.current.value = '';
    };

    const newUploads = [...data.images, ...data.files];
    const newBytes = newUploads.reduce((sum, f) => sum + f.size, 0);
    const tooBig = limits.total_bytes && newBytes > limits.total_bytes * 0.95;
    const tooMany = limits.max_files && newUploads.length > limits.max_files;

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
    const imageErrors = Object.entries(errors).filter(([k]) => k.startsWith('images')).map(([, v]) => v);

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
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
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
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

                    <ExercisesEditor
                        rows={data.exercises}
                        onChange={(rows) => setData('exercises', rows)}
                        names={exerciseNames}
                        errors={errors}
                    />

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Images</span>
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files); }}
                            className="grid grid-cols-3 sm:grid-cols-5 gap-2"
                        >
                            {keptImages.map((f) => (
                                <Thumb
                                    key={`old-${f.id}`}
                                    src={f.url}
                                    name={f.name}
                                    onRemove={() => setData('remove_file_ids', [...data.remove_file_ids, f.id])}
                                />
                            ))}
                            {data.images.map((f, i) => (
                                <Thumb
                                    key={`new-${i}-${f.name}`}
                                    file={f}
                                    name={f.name}
                                    isNew
                                    onRemove={() => setData('images', data.images.filter((_, j) => j !== i))}
                                />
                            ))}
                            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-center text-xs text-gray-500 hover:border-blue-400 hover:bg-blue-50">
                                <input
                                    ref={imageInput}
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={(e) => addImages(e.target.files)}
                                    className="sr-only"
                                />
                                <span className="text-2xl leading-none text-blue-600">+</span>
                                <span className="mt-1 font-medium text-blue-600">Add images</span>
                            </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Photos, drawings or screenshots of the plan. They show as a gallery on the training page.</p>
                        {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
                        {imageErrors.map((msg, i) => <p key={i} className="mt-1 text-sm text-red-600">{msg}</p>)}
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Video links</span>
                        {data.links.length > 0 && (
                            <div className="mb-2 space-y-2">
                                {data.links.map((l, i) => {
                                    const setLink = (field, value) => setData('links', data.links.map((x, j) => (j === i ? { ...x, [field]: value } : x)));
                                    return (
                                        <div key={i}>
                                            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                                <input
                                                    type="url"
                                                    value={l.url}
                                                    onChange={(e) => setLink('url', e.target.value)}
                                                    placeholder="https://youtu.be/…"
                                                    required
                                                    className="min-w-0 flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={l.label || ''}
                                                    onChange={(e) => setLink('label', e.target.value)}
                                                    placeholder="Label (optional)"
                                                    maxLength={100}
                                                    className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setData('links', data.links.filter((_, j) => j !== i))}
                                                    className="px-2 text-gray-400 hover:text-red-600"
                                                    aria-label="Remove link"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            {(errors[`links.${i}.url`] || errors[`links.${i}.label`]) && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`links.${i}.url`] || errors[`links.${i}.label`]}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {data.links.length < 10 && (
                            <button
                                type="button"
                                onClick={() => setData('links', [...data.links, { url: '', label: '' }])}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                + Add video link
                            </button>
                        )}
                        <p className="mt-1 text-xs text-gray-500">YouTube and Vimeo videos play right on the training page; other links open in a new tab.</p>
                        {errors.links && <p className="mt-1 text-sm text-red-600">{errors.links}</p>}
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-gray-700 mb-1">Files</span>

                        {(keptDocs.length > 0 || data.files.length > 0) && (
                            <ul className="mb-2 divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                {keptDocs.map((f) => (
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
                                PDF, Word/Excel, video files · up to {formatSize(limits.file_bytes)} each
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

function Thumb({ src, file, name, isNew, onRemove }) {
    const [url, setUrl] = useState(src || null);
    useEffect(() => {
        if (!file) return undefined;
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <div className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {url && <img src={url} alt={name} className="h-full w-full object-cover" />}
            {isNew && <span className="absolute bottom-1 left-1 rounded bg-green-600 px-1.5 text-[10px] font-medium text-white">new</span>}
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${name}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600"
            >
                ✕
            </button>
        </div>
    );
}

// Exercise list of a training. Order matters; a "Men" row right after a "Women" row is the
// same step (women and men do different exercises at the same time).
function ExercisesEditor({ rows, onChange, names, errors }) {
    const set = (i, field, value) => onChange(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
    const move = (i, step) => {
        const j = i + step;
        if (j < 0 || j >= rows.length) return;
        const next = [...rows];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    let number = 0;
    const numbers = rows.map((r, i) => {
        if (!(r.group === 'men' && rows[i - 1]?.group === 'women')) number++;
        return number;
    });

    return (
        <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Exercises</span>
            <datalist id="exercise-names">
                {names.map((n) => <option key={n} value={n} />)}
            </datalist>
            {rows.length > 0 && (
                <ol className="mb-2 space-y-2">
                    {rows.map((r, i) => (
                        <li key={i} className="rounded-lg border border-gray-200 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="w-6 text-right text-sm font-semibold text-gray-400">{numbers[i]}</span>
                                <select
                                    value={r.group}
                                    onChange={(e) => set(i, 'group', e.target.value)}
                                    aria-label="Who does it"
                                    className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                >
                                    <option value="all">Everyone</option>
                                    <option value="women">Women</option>
                                    <option value="men">Men</option>
                                </select>
                                <input
                                    type="text"
                                    list="exercise-names"
                                    value={r.name}
                                    onChange={(e) => set(i, 'name', e.target.value)}
                                    placeholder="Exercise (pick or type a new one)"
                                    required
                                    maxLength={150}
                                    className="min-w-[12rem] flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                />
                                <div className="flex items-center">
                                    <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</IconButton>
                                    <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>↓</IconButton>
                                    <IconButton label="Remove exercise" onClick={() => onChange(rows.filter((_, j) => j !== i))} danger>✕</IconButton>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:pl-8">
                                <SmallInput value={r.sets} onChange={(v) => set(i, 'sets', v)} placeholder="Sets × reps, e.g. 3×20" />
                                <SmallInput value={r.rest} onChange={(v) => set(i, 'rest', v)} placeholder="Rest, e.g. 60-75 s" />
                                {r.group !== 'men' && (
                                    <SmallInput value={r.load_women} onChange={(v) => set(i, 'load_women', v)} placeholder="Load women" />
                                )}
                                {r.group !== 'women' && (
                                    <SmallInput value={r.load_men} onChange={(v) => set(i, 'load_men', v)} placeholder="Load men" />
                                )}
                            </div>
                            {errors[`exercises.${i}.name`] && <p className="mt-1 text-sm text-red-600">{errors[`exercises.${i}.name`]}</p>}
                        </li>
                    ))}
                </ol>
            )}
            <button type="button" onClick={() => onChange([...rows, emptyExercise()])} className="text-sm text-blue-600 hover:underline">
                + Add exercise
            </button>
            <p className="mt-1 text-xs text-gray-500">
                Pick an exercise from the library (illustration and instructions come with it) or type a new name to add it.
                A “Men” row right after a “Women” row is the same step.
            </p>
        </div>
    );
}

function SmallInput({ value, onChange, placeholder }) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
        />
    );
}

function IconButton({ label, onClick, disabled, danger, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`h-8 w-8 rounded text-sm disabled:opacity-30 ${danger ? 'text-gray-400 hover:text-red-600' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            {children}
        </button>
    );
}
