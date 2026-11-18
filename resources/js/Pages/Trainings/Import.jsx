import { Link } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import Layout from '../../Components/Layout';
import { TypeBadge, formatDate, formatSize } from '../../Components/Trainings/shared';

// Bulk import of trainings from a prepared trainings-import.json plus its images and PDFs.
// Everything is read in the browser first; nothing is saved until "Import" is clicked.

const keyOf = (t) => `${t.type}|${t.date}|${t.title.trim().toLowerCase()}`;

function csrfHeaders() {
    // Prefer the XSRF cookie: it always matches the current session.
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice(11);
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : token ? { 'X-CSRF-TOKEN': token } : {}),
    };
}

async function send(url, body, json = false) {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...csrfHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) },
        body: json ? JSON.stringify(body) : body,
    });
    if (!response.ok) {
        let message = `Server error (${response.status}).`;
        if (response.status === 413) message = 'The files are larger than the server accepts in one request.';
        else if (response.status === 419) message = 'The session expired. Reload the page and start again.';
        else {
            try {
                const data = await response.json();
                const first = data?.errors && Object.values(data.errors)[0];
                message = (Array.isArray(first) ? first[0] : first) || data?.message || message;
            } catch {
                // Not JSON; keep the generic message.
            }
        }
        throw new Error(message);
    }
    return response.json();
}

export default function TrainingsImport({ notReady, limits }) {
    const input = useRef(null);
    const [manifest, setManifest] = useState(null); // { name, trainings, exercises }
    const [files, setFiles] = useState({}); // name -> File
    const [existing, setExisting] = useState(null); // Set of keys, null while checking
    const [error, setError] = useState('');
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState({}); // key -> 'done' | 'skipped' | error message
    const [finished, setFinished] = useState(false);

    const pick = async (list) => {
        setError('');
        setFinished(false);
        setResults({});
        const picked = Array.from(list || []);
        const jsonFile = picked.find((f) => f.name.toLowerCase().endsWith('.json'));
        if (!jsonFile) {
            setError('Select the import file (trainings-import.json) together with its images and PDFs.');
            return;
        }
        let data;
        try {
            data = JSON.parse(await jsonFile.text());
        } catch {
            setError(`${jsonFile.name} is not a valid import file.`);
            return;
        }
        if (data?.format !== 'clubmotion-trainings' || !Array.isArray(data.trainings)) {
            setError(`${jsonFile.name} is not a trainings import file.`);
            return;
        }
        const byName = {};
        for (const f of picked) if (f !== jsonFile) byName[f.name] = f;
        setFiles(byName);
        setManifest({ name: jsonFile.name, trainings: data.trainings, exercises: data.exercises || [] });
        setExisting(null);
        try {
            const res = await send('/trainings/import/check', {
                items: data.trainings.map((t) => ({ type: t.type, date: t.date, title: t.title, replaces: t.replaces || [] })),
            }, true);
            setExisting(new Set(res.existing));
        } catch (e) {
            setError(e.message);
        }
        if (input.current) input.current.value = '';
    };

    const rows = useMemo(() => (manifest?.trainings || []).map((t) => {
        const names = [...(t.images || []), ...(t.files || [])];
        const missing = names.filter((n) => !files[n]);
        const key = keyOf(t);
        const tooBig = names.filter((n) => files[n] && limits.file_bytes && files[n].size > limits.file_bytes);
        return { t, key, names, missing, tooBig, exists: existing?.has(key) };
    }), [manifest, files, existing, limits.file_bytes]);
    const exerciseList = manifest?.exercises || [];
    const missingExerciseImages = exerciseList.filter((e) => e.image && !files[e.image]).map((e) => e.image);

    const toImport = rows.filter((r) => r.missing.length === 0 && r.tooBig.length === 0);
    const blocked = rows.filter((r) => r.missing.length > 0 || r.tooBig.length > 0);
    const counts = {
        added: toImport.filter((r) => !r.exists).length,
        updated: toImport.filter((r) => r.exists).length,
        exerciseRows: toImport.reduce((s, r) => s + (r.t.exercises?.length || 0), 0),
    };
    const totalBytes = Object.values(files).reduce((s, f) => s + f.size, 0);
    const dates = rows.map((r) => r.t.date).sort();
    const trainingResults = Object.entries(results).filter(([k]) => !k.startsWith('ex|'));
    const doneCount = trainingResults.filter(([, v]) => v === 'done' || v === 'updated').length;
    const failed = Object.entries(results).filter(([, v]) => v !== 'done' && v !== 'updated');
    const total = toImport.length + exerciseList.length;

    const run = async () => {
        setRunning(true);
        setFinished(false);
        // 1. Exercise library (illustrations, muscles, how to). Existing ones only get what they miss.
        for (const e of exerciseList) {
            if (results[`ex|${e.name}`] === 'done') continue;
            const body = new FormData();
            body.append('name', e.name);
            body.append('muscles', e.muscles || '');
            body.append('how_to', e.how_to || '');
            if (e.image && files[e.image]) body.append('image', files[e.image]);
            try {
                await send('/trainings/import/exercise', body);
                setResults((prev) => ({ ...prev, [`ex|${e.name}`]: 'done' }));
            } catch (err) {
                setResults((prev) => ({ ...prev, [`ex|${e.name}`]: `${e.name}: ${err.message}` }));
            }
        }
        // 2. Trainings, one per request.
        const uploaded = {}; // file name -> stored file id, so shared files go up once
        for (const r of toImport) {
            if (results[r.key] === 'done' || results[r.key] === 'updated') continue;
            const body = new FormData();
            body.append('type', r.t.type);
            body.append('title', r.t.title);
            body.append('training_date', r.t.date);
            body.append('description', r.t.description || '');
            (r.t.remove_files || []).forEach((n) => body.append('remove_files[]', n));
            (r.t.replaces || []).forEach((n) => body.append('replaces[]', n));
            if (Array.isArray(r.t.exercises)) {
                body.append('exercises_sent', '1');
                r.t.exercises.forEach((x, i) => {
                    for (const f of ['name', 'group', 'position', 'sets', 'rest', 'load_women', 'load_men', 'note']) {
                        if (x[f] !== undefined && x[f] !== null) body.append(`exercises[${i}][${f}]`, x[f]);
                    }
                });
            }
            (r.t.links || []).forEach((l, i) => {
                body.append(`links[${i}][url]`, l.url);
                body.append(`links[${i}][label]`, l.label || '');
            });
            for (const n of r.t.images || []) {
                if (uploaded[n]) body.append('copy_file_ids[]', uploaded[n]);
                else body.append('images[]', files[n]);
            }
            for (const n of r.t.files || []) {
                if (uploaded[n]) body.append('copy_file_ids[]', uploaded[n]);
                else body.append('files[]', files[n]);
            }
            try {
                const res = await send('/trainings/import/item', body);
                for (const f of res.files || []) if (!uploaded[f.name]) uploaded[f.name] = f.id;
                setResults((prev) => ({ ...prev, [r.key]: res.updated ? 'updated' : 'done' }));
            } catch (e) {
                setResults((prev) => ({ ...prev, [r.key]: e.message }));
            }
        }
        setRunning(false);
        setFinished(true);
    };

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <h1 className="mb-1 text-2xl font-bold text-gray-800">Import trainings</h1>
                <p className="mb-4 text-sm text-gray-600">
                    Adds many trainings at once from a prepared import file. You see the list first; nothing is saved until you click Import.
                    A training that already exists (same type, date and title, or an older title the file says it replaces) is updated instead of added twice, so running it again is safe.
                </p>

                {notReady ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
                        Run the database updates first (Settings → App settings → Database updates).
                    </div>
                ) : (
                    <>
                        <label
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); if (!running) pick(e.dataTransfer.files); }}
                            className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center hover:border-blue-400 hover:bg-blue-50 ${running ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <input
                                ref={input}
                                type="file"
                                multiple
                                accept=".json,.pdf,.jpg,.jpeg,.png,.webp,.gif"
                                onChange={(e) => pick(e.target.files)}
                                className="sr-only"
                            />
                            <span className="font-medium text-blue-600">Select all files from the import folder</span>
                            <span className="mt-1 text-xs text-gray-500">
                                trainings-import.json together with its images and PDFs (in the folder: Cmd+A or Ctrl+A, then Open). Or drop them here.
                            </span>
                        </label>

                        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

                        {manifest && (
                            <div className="mb-4 rounded-lg bg-white p-4 shadow">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-sm text-gray-700">
                                        <div className="font-medium text-gray-900">
                                            {manifest.trainings.length} trainings in {manifest.name}
                                            {dates.length > 0 && <span className="font-normal text-gray-500"> · {formatDate(dates[0])} – {formatDate(dates[dates.length - 1])}</span>}
                                        </div>
                                        {existing === null ? (
                                            <div className="text-gray-500">Checking which already exist…</div>
                                        ) : (
                                            <div>
                                                New: <b>{counts.added}</b> · update: <b>{counts.updated}</b>
                                                {exerciseList.length > 0 && <> · {exerciseList.length} exercises in the library, {counts.exerciseRows} in trainings</>}
                                                {blocked.length > 0 && <span className="text-red-700"> · cannot import: {blocked.length}</span>}
                                                <span className="text-gray-500"> · {Object.keys(files).length} files, {formatSize(totalBytes)}</span>
                                                {missingExerciseImages.length > 0 && (
                                                    <div className="text-red-700">Missing exercise images: {missingExerciseImages.join(', ')}</div>
                                                )}
                                                {counts.updated > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        Update = same type, date and title (or its older title) already in the app: its title, description and exercises are replaced
                                                        {rows.some((r) => r.exists && r.t.remove_files?.length) ? ', and the old plan page/PDF attachments are removed' : ''}.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={run}
                                        disabled={running || existing === null || toImport.length === 0 || missingExerciseImages.length > 0 || (finished && failed.length === 0)}
                                        className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {running ? `Importing… ${Object.keys(results).length}/${total}` : failed.length ? 'Retry failed' : `Import ${toImport.length} trainings`}
                                    </button>
                                </div>

                                {(running || finished) && (
                                    <div className="mt-3">
                                        <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
                                            <div
                                                className="h-full bg-blue-600 transition-all"
                                                style={{ width: `${total ? (Object.keys(results).length / total) * 100 : 0}%` }}
                                            />
                                        </div>
                                        {finished && (
                                            <p className={`mt-2 text-sm ${failed.length ? 'text-red-700' : 'text-green-700'}`}>
                                                {doneCount} trainings imported{failed.length ? `, ${failed.length} failed: ${failed.slice(0, 3).map(([, v]) => v).join('; ')}` : ''}.{' '}
                                                <Link href="/trainings" className="text-blue-600 hover:underline">Open the calendar →</Link>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {manifest && (
                            <div className="overflow-hidden rounded-lg bg-white shadow">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Training</th>
                                            <th className="hidden sm:table-cell px-3 py-2">Attachments</th>
                                            <th className="px-3 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rows.map((r) => (
                                            <tr key={r.key}>
                                                <td className="px-3 py-2 whitespace-nowrap align-top">{formatDate(r.t.date)}</td>
                                                <td className="px-3 py-2 align-top">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <TypeBadge type={r.t.type} />
                                                        <span className="font-medium">{r.t.title}</span>
                                                    </div>
                                                    {r.t.description && (
                                                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">{r.t.description}</div>
                                                    )}
                                                </td>
                                                <td className="hidden sm:table-cell px-3 py-2 align-top text-xs text-gray-500">
                                                    {r.t.exercises?.length > 0 && <div>🏋️ {r.t.exercises.length} exercises</div>}
                                                    {r.names.map((n) => (
                                                        <div key={n} className={`truncate max-w-[16rem] ${!files[n] || r.tooBig.includes(n) ? 'text-red-600' : ''}`}>
                                                            {n}{!files[n] ? ' — not selected' : r.tooBig.includes(n) ? ' — too large' : ''}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="px-3 py-2 text-right align-top whitespace-nowrap">
                                                    <Status row={r} result={results[r.key]} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}

function Status({ row, result }) {
    if (row.missing.length) return <span className="text-xs text-red-600">Missing {row.missing.length} file(s)</span>;
    if (row.tooBig.length) return <span className="text-xs text-red-600">File too large</span>;
    if (result === 'done') return <span className="text-xs font-medium text-green-700">✓ Added</span>;
    if (result === 'updated') return <span className="text-xs font-medium text-green-700">✓ Updated</span>;
    if (result) return <span className="text-xs text-red-600" title={result}>✕ {result.length > 40 ? `${result.slice(0, 40)}…` : result}</span>;
    return row.exists ? <span className="text-xs text-amber-700">Update</span> : <span className="text-xs text-blue-700">New</span>;
}
