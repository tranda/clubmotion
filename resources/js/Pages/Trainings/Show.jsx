import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Layout from '../../Components/Layout';
import ExerciseModal, { GroupChip } from '../../Components/Trainings/ExerciseModal';
import { TypeBadge, formatDate, formatSize, isImageMime, isToday, linkLabel, videoEmbedUrl } from '../../Components/Trainings/shared';

const isImage = (f) => isImageMime(f.mime);
const isPdf = (f) => f.mime === 'application/pdf';

export default function TrainingShow({ training: t }) {
    const { auth } = usePage().props;
    const role = auth.user?.role?.name || 'user';
    const canManage = role === 'admin' || role === 'superuser';

    const images = t.files.filter(isImage);
    const [viewing, setViewing] = useState(null); // index of the image open in the viewer
    const exercises = t.exercises || [];
    const [openExercise, setOpenExercise] = useState(null); // index into exercises
    const others = t.files.filter((f) => !isImage(f));
    const links = t.links || [];
    const embeds = links.map((l) => ({ ...l, embed: videoEmbedUrl(l.url) })).filter((l) => l.embed);
    const plainLinks = links.filter((l) => !videoEmbedUrl(l.url));

    return (
        <Layout>
            <div className="py-4 max-w-3xl mx-auto">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <Link href={t.date ? `/trainings?date=${t.date}` : '/trainings'} className="text-sm text-blue-600 hover:underline">
                        ← Trainings
                    </Link>
                    {canManage && (
                        <Link
                            href={`/trainings/${t.id}/edit`}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                        >
                            Edit
                        </Link>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <TypeBadge type={t.type} />
                        {t.date && <span className="text-gray-600">{formatDate(t.date)}</span>}
                        {isToday(t.date) && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">Today</span>
                        )}
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">{t.title}</h1>

                    {t.description && (
                        <div className="mt-4 text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{t.description}</div>
                    )}

                    {exercises.length > 0 && (
                        <ExerciseList exercises={exercises} onOpen={setOpenExercise} />
                    )}

                    {images.length === 1 && (
                        <button type="button" onClick={() => setViewing(0)} className="mt-5 block w-full">
                            <img src={images[0].url} alt={images[0].name} className="w-full max-h-[32rem] object-contain rounded-lg border border-gray-200 bg-gray-50" />
                        </button>
                    )}
                    {images.length > 1 && (
                        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {images.map((f, i) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setViewing(i)}
                                    className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                                >
                                    <img src={f.url} alt={f.name} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform" />
                                </button>
                            ))}
                        </div>
                    )}

                    {embeds.length > 0 && (
                        <div className="mt-5 space-y-4">
                            {embeds.map((l, i) => (
                                <figure key={i}>
                                    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: '56.25%' }}>
                                        <iframe
                                            src={l.embed}
                                            title={linkLabel(l)}
                                            className="absolute inset-0 h-full w-full"
                                            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                        />
                                    </div>
                                    <figcaption className="mt-1 flex items-center justify-between gap-2 text-sm text-gray-600">
                                        <span className="truncate">{l.label || ''}</span>
                                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-600 hover:underline">
                                            Open in app ↗
                                        </a>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    )}

                    {plainLinks.length > 0 && (
                        <ul className="mt-5 space-y-2">
                            {plainLinks.map((l, i) => (
                                <li key={i}>
                                    <a
                                        href={l.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                                    >
                                        <span className="text-xl" aria-hidden>▶️</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-900">{linkLabel(l)}</span>
                                            <span className="block truncate text-xs text-gray-500">{l.url}</span>
                                        </span>
                                        <span className="text-sm text-blue-600">Open ↗</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}

                    {others.length > 0 && (
                        <ul className="mt-5 divide-y divide-gray-100 border border-gray-200 rounded-lg">
                            {others.map((f) => (
                                <li key={f.id} className="flex items-center gap-3 p-3">
                                    <span className="text-xl" aria-hidden>{isPdf(f) ? '📄' : '📎'}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500">{formatSize(f.size)}</div>
                                    </div>
                                    {isPdf(f) && (
                                        <a
                                            href={f.url}
                                            target="_blank"
                                            rel="noopener"
                                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Open
                                        </a>
                                    )}
                                    <a
                                        href={`${f.url}?download=1`}
                                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                                    >
                                        Download
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!t.description && t.files.length === 0 && links.length === 0 && exercises.length === 0 && (
                        <p className="mt-4 text-sm text-gray-500">No details added yet.</p>
                    )}

                    {t.updated_at && (
                        <p className="mt-5 text-xs text-gray-400">
                            Updated {t.updated_at}{t.updated_by ? ` by ${t.updated_by}` : ''}
                        </p>
                    )}
                </div>
            </div>

            {openExercise !== null && exercises[openExercise] && (
                <ExerciseModal items={exercises} index={openExercise} onChange={setOpenExercise} onClose={() => setOpenExercise(null)} />
            )}

            {viewing !== null && images[viewing] && (
                <ImageViewer images={images} index={viewing} onChange={setViewing} onClose={() => setViewing(null)} />
            )}
        </Layout>
    );
}

// Full-screen image viewer: arrows / swipe to move, Esc or tap outside to close.
function ImageViewer({ images, index, onChange, onClose }) {
    const count = images.length;
    const go = (step) => onChange((index + step + count) % count);
    const [touchX, setTouchX] = useState(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight' && count > 1) go(1);
            else if (e.key === 'ArrowLeft' && count > 1) go(-1);
        };
        window.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    });

    const img = images[index];
    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-black/90"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
                if (touchX === null || count < 2) return;
                const dx = e.changedTouches[0].clientX - touchX;
                if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                setTouchX(null);
            }}
        >
            <div className="flex items-center justify-between gap-2 p-3 text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
                <span className="truncate">{count > 1 ? `${index + 1} / ${count} · ` : ''}{img.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                    <a href={`${img.url}?download=1`} className="rounded px-2 py-1 hover:bg-white/10">Download</a>
                    <button type="button" onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full text-xl hover:bg-white/10">✕</button>
                </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
                <img
                    src={img.url}
                    alt={img.name}
                    onClick={(e) => e.stopPropagation()}
                    className="max-h-full max-w-full object-contain"
                />
                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); go(-1); }}
                            aria-label="Previous image"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); go(1); }}
                            aria-label="Next image"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
                        >
                            ›
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// Exercises in order. Rows where women and men do different exercises show both side by side.
function ExerciseList({ exercises, onOpen }) {
    const rows = [];
    exercises.forEach((e, i) => {
        const last = rows[rows.length - 1];
        if (last && last.position === e.position) last.items.push([e, i]);
        else rows.push({ position: e.position, items: [[e, i]] });
    });

    return (
        <section className="mt-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Exercises <span className="font-normal normal-case tracking-normal text-gray-400">· tap one for details</span>
            </h2>
            <ol className="space-y-2">
                {rows.map((row) => (
                    <li key={row.position} className="flex gap-2">
                        <span className="mt-3 w-5 shrink-0 text-right text-sm font-semibold text-gray-400">{row.position}</span>
                        <div className={`grid min-w-0 flex-1 gap-2 ${row.items.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                            {row.items.map(([e, i]) => <ExerciseCard key={e.id} item={e} onClick={() => onOpen(i)} />)}
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function ExerciseCard({ item, onClick }) {
    const ex = item.exercise || {};
    const loads = item.load_women && item.load_women === item.load_men
        ? item.load_women
        : [item.load_women && `Ž ${item.load_women}`, item.load_men && `M ${item.load_men}`].filter(Boolean).join(' · ');
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-blue-300 hover:bg-blue-50/40"
        >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50">
                {ex.image_url
                    ? <img src={ex.image_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                    : <span className="text-2xl" aria-hidden>🏋️</span>}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-900">{ex.name}</span>
                    <GroupChip group={item.group} />
                </span>
                {(item.sets || item.rest) && (
                    <span className="block text-sm text-gray-700">
                        {item.sets}{item.sets && item.rest ? ' · ' : ''}{item.rest && `pauza ${item.rest}`}
                    </span>
                )}
                {loads && <span className="block truncate text-xs text-gray-500">{loads}</span>}
            </span>
            <span className="text-gray-300" aria-hidden>›</span>
        </button>
    );
}
