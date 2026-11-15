import { useEffect, useState } from 'react';

export const GROUP_LABELS = { all: '', women: 'Women', men: 'Men' };

// One exercise, full screen on phones: illustration, this training's dose (if any),
// muscles and how to do it. `items` is the list to step through with ‹ › or a swipe;
// each item is either a training exercise ({ exercise, sets, ... }) or a plain exercise.
export default function ExerciseModal({ items, index, onChange, onClose }) {
    const count = items.length;
    const item = items[index];
    const ex = item.exercise || item;
    const dose = item.exercise ? item : null;
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={ex.name}
            onClick={onClose}
        >
            <div
                className="relative flex max-h-full w-full sm:max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                    if (touchX === null || count < 2) return;
                    const dx = e.changedTouches[0].clientX - touchX;
                    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
                    setTouchX(null);
                }}
            >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                    <div className="flex items-center gap-1">
                        {count > 1 && (
                            <>
                                <NavButton label="Previous exercise" onClick={() => go(-1)}>‹</NavButton>
                                <span className="min-w-[3rem] text-center text-xs text-gray-500">{index + 1} / {count}</span>
                                <NavButton label="Next exercise" onClick={() => go(1)}>›</NavButton>
                            </>
                        )}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-xl text-gray-500 hover:bg-gray-100">
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto">
                    {ex.image_url ? (
                        <div className="flex justify-center bg-white px-4 pt-4">
                            <img src={ex.image_url} alt={ex.name} className="max-h-[40vh] w-auto max-w-full object-contain" />
                        </div>
                    ) : (
                        <div className="mx-4 mt-4 flex h-32 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">No illustration</div>
                    )}

                    <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                            {dose && <span className="text-sm font-semibold text-gray-400">#{dose.position}</span>}
                            <h2 className="text-xl font-bold text-gray-900">{ex.name}</h2>
                            {dose && dose.group !== 'all' && <GroupChip group={dose.group} />}
                        </div>

                        {dose && (dose.sets || dose.rest || dose.load_women || dose.load_men) && (
                            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                {dose.sets && <Fact label="Sets × reps" value={dose.sets} />}
                                {dose.rest && <Fact label="Rest" value={dose.rest} />}
                                {dose.load_women && dose.load_women === dose.load_men ? (
                                    <Fact label="Load" value={dose.load_women} wide />
                                ) : (
                                    <>
                                        {dose.load_women && <Fact label="Load · women" value={dose.load_women} wide={!dose.load_men} />}
                                        {dose.load_men && <Fact label="Load · men" value={dose.load_men} wide={!dose.load_women} />}
                                    </>
                                )}
                            </dl>
                        )}
                        {dose?.note && <p className="mt-2 text-sm text-gray-600">{dose.note}</p>}

                        {ex.muscles && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Muscles</h3>
                                <p className="mt-1 text-sm text-gray-800">{ex.muscles}</p>
                            </div>
                        )}
                        {ex.how_to && (
                            <div className="mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">How to do it</h3>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{ex.how_to}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GroupChip({ group }) {
    if (!GROUP_LABELS[group]) return null;
    const cls = group === 'women' ? 'bg-pink-100 text-pink-800' : 'bg-indigo-100 text-indigo-800';
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{GROUP_LABELS[group]}</span>;
}

function Fact({ label, value, wide }) {
    return (
        <div className={`rounded-lg bg-gray-50 px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
        </div>
    );
}

function NavButton({ label, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="h-9 w-9 rounded-full text-2xl leading-none text-gray-600 hover:bg-gray-100"
        >
            {children}
        </button>
    );
}
