import { Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Layout from '../../Components/Layout';
import { TypeBadge, formatDate, isToday, todayIso } from '../../Components/Trainings/shared';

const TYPE_TABS = [
    { value: '', label: 'All' },
    { value: 'water', label: 'Water' },
    { value: 'gym', label: 'Gym' },
];
const VIEW_TABS = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'list', label: 'List' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Local-date helpers on "YYYY-MM-DD" strings (no timezone shifts).
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const d = parse(iso); d.setDate(d.getDate() + n); return toIso(d); };
const addMonths = (iso, n) => { const d = parse(iso); return toIso(new Date(d.getFullYear(), d.getMonth() + n, 1)); };

const pillClass = (type) => (type === 'gym'
    ? 'bg-orange-100 text-orange-900 hover:bg-orange-200 border-l-4 border-orange-500'
    : 'bg-sky-100 text-sky-900 hover:bg-sky-200 border-l-4 border-sky-500');
const dotClass = (type) => (type === 'gym' ? 'bg-orange-500' : 'bg-sky-500');

export default function TrainingsIndex(props) {
    const { notReady, view = 'month', filters = {} } = props;
    const { auth } = usePage().props;
    const role = auth.user?.role?.name || 'user';
    const canManage = role === 'admin' || role === 'superuser';
    const type = filters.type || '';

    const go = (params) => {
        const next = { view, type, date: props.range?.anchor, ...params };
        const query = {};
        if (next.view && next.view !== 'month') query.view = next.view;
        if (next.type) query.type = next.type;
        if (next.date && next.view !== 'list') query.date = next.date;
        if (next.older) query.older = 1;
        router.get('/trainings', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    const createHref = (date) => {
        const p = new URLSearchParams();
        if (type) p.set('type', type);
        if (date) p.set('date', date);
        const s = p.toString();
        return s ? `/trainings/create?${s}` : '/trainings/create';
    };

    return (
        <Layout>
            <div className="py-4 max-w-6xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Trainings</h1>
                    {canManage && !notReady && (
                        <div className="flex items-center gap-2">
                            <Link href="/trainings/import" className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">
                                Import
                            </Link>
                            <Link href={createHref('')} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                + New training
                            </Link>
                        </div>
                    )}
                </div>

                {notReady ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
                        Trainings are not available yet. An admin needs to run the database updates
                        (Settings → App settings → Database updates).
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <Segmented options={VIEW_TABS} value={view} onChange={(v) => go({ view: v })} />
                            <Segmented options={TYPE_TABS} value={type} onChange={(v) => go({ type: v })} />
                        </div>

                        {view === 'list' ? (
                            <ListView {...props} onShowOlder={() => go({ older: true })} />
                        ) : (
                            <CalendarView
                                view={view}
                                range={props.range}
                                items={props.calendar || []}
                                canManage={canManage}
                                createHref={createHref}
                                onNavigate={(date) => go({ date })}
                                onOpenWeek={(date) => go({ view: 'week', date })}
                            />
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}

function Segmented({ options, value, onChange }) {
    return (
        <div className="inline-flex rounded-lg bg-gray-100 p-1" role="tablist">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={value === o.value}
                    onClick={() => value !== o.value && onChange(o.value)}
                    className={`px-3 sm:px-4 py-1.5 text-sm rounded-md transition-colors ${
                        value === o.value ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function CalendarView({ view, range, items, canManage, createHref, onNavigate, onOpenWeek }) {
    const today = todayIso();
    const anchor = parse(range.anchor);

    const byDay = useMemo(() => {
        const map = {};
        for (const t of items) (map[t.date] ||= []).push(t);
        return map;
    }, [items]);

    const days = useMemo(() => {
        const list = [];
        for (let d = range.start; d <= range.end; d = addDays(d, 1)) list.push(d);
        return list;
    }, [range.start, range.end]);

    // Phone month view: tap a day to list its trainings under the grid.
    const defaultSelected = days.includes(today) ? today : (items[0]?.date || null);
    const [selected, setSelected] = useState(defaultSelected);
    const selectedDay = days.includes(selected) ? selected : defaultSelected;

    const title = view === 'month'
        ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
        : weekTitle(range.start, range.end);

    const prev = view === 'month' ? addMonths(range.anchor, -1) : addDays(range.start, -7);
    const next = view === 'month' ? addMonths(range.anchor, 1) : addDays(range.start, 7);
    const inRange = today >= range.start && today <= range.end
        && (view === 'week' || parse(today).getMonth() === anchor.getMonth());

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                <div className="flex items-center gap-1">
                    <NavButton label="Previous" onClick={() => onNavigate(prev)}>‹</NavButton>
                    <NavButton label="Next" onClick={() => onNavigate(next)}>›</NavButton>
                    {!inRange && (
                        <button
                            type="button"
                            onClick={() => onNavigate(today)}
                            className="ml-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Today
                        </button>
                    )}
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">{title}</h2>
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Water</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Gym</span>
                </div>
            </div>

            {view === 'month' ? (
                <>
                    <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-medium text-gray-500">
                        {WEEKDAYS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                        {days.map((d) => (
                            <MonthCell
                                key={d}
                                date={d}
                                items={byDay[d] || []}
                                outside={parse(d).getMonth() !== anchor.getMonth()}
                                isToday={d === today}
                                isSelected={d === selectedDay}
                                onSelect={() => setSelected(d)}
                                onMore={() => onOpenWeek(d)}
                                canManage={canManage}
                                createHref={createHref}
                            />
                        ))}
                    </div>
                    {/* Phones: the cells only show dots, so list the chosen day here. */}
                    <div className="sm:hidden border-t border-gray-100 p-3">
                        {selectedDay ? (
                            <DayList date={selectedDay} items={byDay[selectedDay] || []} canManage={canManage} createHref={createHref} />
                        ) : (
                            <p className="text-sm text-gray-500">Tap a day to see its trainings.</p>
                        )}
                    </div>
                </>
            ) : (
                <div className="grid sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {days.map((d, i) => (
                        <WeekColumn
                            key={d}
                            date={d}
                            weekday={WEEKDAYS[i]}
                            items={byDay[d] || []}
                            isToday={d === today}
                            canManage={canManage}
                            createHref={createHref}
                        />
                    ))}
                </div>
            )}

            {items.length === 0 && (
                <p className="border-t border-gray-100 px-3 py-3 text-center text-sm text-gray-500">
                    No trainings in this {view}.
                </p>
            )}
        </div>
    );
}

function NavButton({ label, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-xl leading-none text-gray-600 hover:bg-gray-100"
        >
            {children}
        </button>
    );
}

function weekTitle(start, end) {
    const s = parse(start);
    const e = parse(end);
    const short = (d) => MONTHS[d.getMonth()].slice(0, 3);
    if (s.getMonth() === e.getMonth()) return `${s.getDate()}–${e.getDate()} ${short(e)} ${e.getFullYear()}`;
    if (s.getFullYear() === e.getFullYear()) return `${s.getDate()} ${short(s)} – ${e.getDate()} ${short(e)} ${e.getFullYear()}`;
    return `${s.getDate()} ${short(s)} ${s.getFullYear()} – ${e.getDate()} ${short(e)} ${e.getFullYear()}`;
}

const MAX_PILLS = 3;

function MonthCell({ date, items, outside, isToday, isSelected, onSelect, onMore, canManage, createHref }) {
    const dayNum = parse(date).getDate();
    const extra = items.length - MAX_PILLS;

    return (
        <div
            onClick={onSelect}
            className={`group relative min-h-[3.5rem] sm:min-h-[6.5rem] border-b border-r border-gray-100 p-1 cursor-pointer sm:cursor-default ${
                outside ? 'bg-gray-50/70' : ''
            } ${isSelected ? 'max-sm:bg-blue-50' : ''}`}
        >
            <div className="flex items-center justify-between">
                <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? 'bg-blue-600 text-white font-semibold' : outside ? 'text-gray-400' : 'text-gray-700'
                    }`}
                >
                    {dayNum}
                </span>
                {canManage && (
                    <Link
                        href={createHref(date)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Add training on ${formatDate(date)}`}
                        className="hidden sm:flex h-5 w-5 items-center justify-center rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-blue-600"
                    >
                        +
                    </Link>
                )}
            </div>

            {/* Phones: colored dots */}
            {items.length > 0 && (
                <div className="sm:hidden mt-1 flex flex-wrap justify-center gap-0.5">
                    {items.slice(0, 4).map((t) => <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${dotClass(t.type)}`} />)}
                </div>
            )}

            {/* Larger screens: short titles */}
            <div className="hidden sm:block mt-0.5 space-y-0.5">
                {items.slice(0, MAX_PILLS).map((t) => (
                    <Link
                        key={t.id}
                        href={`/trainings/${t.id}`}
                        title={t.title}
                        className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium ${pillClass(t.type)}`}
                    >
                        {t.title}
                    </Link>
                ))}
                {extra > 0 && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onMore(); }}
                        className="px-1.5 text-xs text-gray-500 hover:text-blue-600 hover:underline"
                    >
                        +{extra} more
                    </button>
                )}
            </div>
        </div>
    );
}

function WeekColumn({ date, weekday, items, isToday, canManage, createHref }) {
    return (
        <div className={`p-2 sm:min-h-[14rem] ${isToday ? 'bg-blue-50/60' : ''}`}>
            <div className="mb-1.5 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                    {weekday}{' '}
                    <span className={`ml-0.5 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-sm ${
                        isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-800'
                    }`}>
                        {parse(date).getDate()}
                    </span>
                </div>
                {canManage && (
                    <Link
                        href={createHref(date)}
                        aria-label={`Add training on ${formatDate(date)}`}
                        className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    >
                        +
                    </Link>
                )}
            </div>
            <div className="space-y-1.5">
                {items.map((t) => (
                    <Link key={t.id} href={`/trainings/${t.id}`} className={`block rounded px-2 py-1.5 ${pillClass(t.type)}`}>
                        <div className="text-sm font-medium leading-snug break-words">{t.title}</div>
                        {(t.files_count > 0 || t.links_count > 0) && (
                            <div className="mt-0.5 text-xs opacity-75">
                                {t.files_count > 0 && <span>📎 {t.files_count}</span>}
                                {t.links_count > 0 && <span className="ml-2">▶ {t.links_count}</span>}
                            </div>
                        )}
                    </Link>
                ))}
                {items.length === 0 && <div className="sm:hidden text-xs text-gray-400">—</div>}
            </div>
        </div>
    );
}

function DayList({ date, items, canManage, createHref }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{formatDate(date)}</h3>
                {canManage && (
                    <Link href={createHref(date)} className="text-sm text-blue-600">+ Add</Link>
                )}
            </div>
            {items.length === 0 ? (
                <p className="text-sm text-gray-500">No trainings on this day.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((t) => (
                        <li key={t.id}>
                            <Link href={`/trainings/${t.id}`} className={`block rounded-lg px-3 py-2 ${pillClass(t.type)}`}>
                                <div className="font-medium">{t.title}</div>
                                {t.preview && <div className="mt-0.5 text-xs opacity-80 line-clamp-2">{t.preview}</div>}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── List ────────────────────────────────────────────────────────────────────

function ListView({ upcoming = [], past = [], pastTotal = 0, onShowOlder }) {
    if (upcoming.length === 0 && past.length === 0) {
        return <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">No dated trainings yet.</div>;
    }
    return (
        <div className="space-y-6">
            <Section title="Upcoming" items={upcoming} emptyText="No upcoming trainings." />
            {past.length > 0 && (
                <Section title="Past" items={past}>
                    {pastTotal > past.length && (
                        <button type="button" onClick={onShowOlder} className="mt-2 text-sm text-blue-600 hover:underline">
                            Show all {pastTotal} past trainings
                        </button>
                    )}
                </Section>
            )}
        </div>
    );
}

function Section({ title, hint, items, emptyText, children }) {
    return (
        <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {title}
                {hint && <span className="ml-2 normal-case font-normal tracking-normal text-gray-400">{hint}</span>}
            </h2>
            {items.length === 0 ? (
                <p className="text-sm text-gray-500">{emptyText}</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((t) => <TrainingCard key={t.id} training={t} />)}
                </ul>
            )}
            {children}
        </section>
    );
}

function TrainingCard({ training: t }) {
    const today = isToday(t.date);
    return (
        <li>
            <Link
                href={`/trainings/${t.id}`}
                className={`block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow ${today ? 'ring-2 ring-blue-500' : ''}`}
            >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <TypeBadge type={t.type} />
                    {t.date && <span className="text-gray-600">{formatDate(t.date)}</span>}
                    {today && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">Today</span>}
                    {(t.files_count > 0 || t.links_count > 0) && (
                        <span className="ml-auto text-xs text-gray-500">
                            {t.files_count > 0 && <>📎 {t.files_count} {t.files_count === 1 ? 'file' : 'files'}</>}
                            {t.links_count > 0 && <span className="ml-2">▶ {t.links_count} {t.links_count === 1 ? 'video' : 'videos'}</span>}
                        </span>
                    )}
                </div>
                <div className="mt-1 font-semibold text-gray-900">{t.title}</div>
                {t.preview && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{t.preview}</p>}
            </Link>
        </li>
    );
}
