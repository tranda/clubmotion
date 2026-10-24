// Shared formatting for the Competition Fees pages.

export const formatMoney = (amount, currency) =>
    `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

// 2026-10-05 -> 05.10.2026
export const formatDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
};

export const todayIso = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

// "28.05.2027 – 30.05.2027 · 2 nights" for room dates, or ''.
export const stayLabel = ({ check_in, check_out, nights }) => {
    if (!check_in && !check_out) return '';
    const range = `${formatDate(check_in)} – ${formatDate(check_out)}`;
    return nights != null ? `${range} · ${nights} night${nights === 1 ? '' : 's'}` : range;
};

const nightsBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)) : null);

// A participant's stay: own dates, else the competition default (room_dates).
export const effectiveStay = (p, defaults = {}) => {
    const check_in = p.check_in || defaults.check_in || null;
    const check_out = p.check_out || defaults.check_out || null;
    return { check_in, check_out, nights: nightsBetween(check_in, check_out) };
};

// Stay covering a room's occupants; `mixed` when their dates differ.
export const stayRange = (people, defaults = {}) => {
    if (people.length === 0) return { ...effectiveStay({}, defaults), mixed: false };
    const stays = people.map((p) => effectiveStay(p, defaults));
    const ins = stays.map((s) => s.check_in).filter(Boolean).sort();
    const outs = stays.map((s) => s.check_out).filter(Boolean).sort();
    const check_in = ins[0] || null;
    const check_out = outs[outs.length - 1] || null;
    return {
        check_in,
        check_out,
        nights: nightsBetween(check_in, check_out),
        mixed: new Set(ins).size > 1 || new Set(outs).size > 1,
    };
};

// Own dates differ from the default?
export const hasOwnStay = (p) => !!(p.check_in || p.check_out);

// "11,700.00 RSD (= 100.00 EUR)" when paid in another currency, else "100.00 EUR".
export const paidLabel = (pay, competitionCurrency) =>
    pay.currency && pay.currency !== competitionCurrency && pay.currency_amount != null
        ? `${formatMoney(pay.currency_amount, pay.currency)} (= ${formatMoney(pay.amount, competitionCurrency)})`
        : formatMoney(pay.amount, competitionCurrency);

export const METHOD_LABELS = { cash: 'Cash', bank_transfer: 'Bank transfer', other: 'Other' };

const STATUS_STYLES = {
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    unpaid: 'bg-red-100 text-red-800',
    no_fee: 'bg-gray-100 text-gray-600',
    exempt: 'bg-gray-100 text-gray-600',
    overpaid: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-400 line-through',
};

const COMPETITION_STATUS_STYLES = {
    planned: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-gray-200 text-gray-700',
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || ''}`}>
            {status === 'no_fee' ? 'No fee yet' : capitalize(status)}
        </span>
    );
}

// "+2 supporters (Ana, Marko), +2 children (Mia 8, 4)" for a participant's
// additional people, or ''. Names from p.extra_names; children's ages from the
// server (p.children) when known. Unnamed adults are counted as "+1".
export const extrasLabel = (p) => {
    const names = p.extra_names || {};
    const adults = (type, n) => {
        const named = (names[type] || []).slice(0, n).map((s) => (s || '').trim()).filter(Boolean);
        if (named.length === 0) return '';
        return ` (${[...named, ...(named.length < n ? [`+${n - named.length}`] : [])].join(', ')})`;
    };
    const kids = Array.from({ length: p.extra_children || 0 }, (_, i) => {
        const name = (names.child?.[i] || '').trim();
        const age = p.children ? (p.children[i]?.age ?? '?') : '';
        return [name, age].filter((x) => x !== '').join(' ');
    }).filter(Boolean);
    return [
        [p.extra_athletes, 'athlete', 'athletes', adults('athlete', p.extra_athletes)],
        [p.extra_supporters, 'supporter', 'supporters', adults('supporter', p.extra_supporters)],
        [p.extra_children, 'child', 'children', kids.length ? ` (${kids.join(', ')})` : ''],
    ]
        .filter(([n]) => n > 0)
        .map(([n, one, many, suffix]) => `+${n} ${n === 1 ? one : many}${suffix}`)
        .join(', ');
};

// Beds a participant's party takes. The server sends `beds` (children count
// depending on their age band); fallback: themselves + additional adults.
export const bedsFor = (p) => (p.beds != null ? p.beds : 1 + (p.extra_athletes || 0) + (p.extra_supporters || 0));

// Summary of the rooms actually created in the planner:
// { bySize: [{ beds, count }], total, beds, used, unassigned }.
// Room planner units of active participants: the participant with the people
// still with them, plus each separated person (from the server's `units`).
export const allUnits = (participants) =>
    participants
        .filter((p) => p.status !== 'cancelled')
        .flatMap((p) => (p.units || [{
            key: `${p.id}:main`, slot: 'main', label: p.member.name, extras: extrasLabel(p), beds: bedsFor(p), room_id: p.room_id,
        }]).map((u) => ({ ...u, participant: p })));

export const roomsSummary = (rooms, participants) => {
    const units = allUnits(participants);
    const inRoom = (u) => rooms.some((r) => r.id === u.room_id);
    const bySize = [1, 2, 3, 4, 5]
        .map((beds) => ({ beds, count: rooms.filter((r) => r.beds === beds).length }))
        .filter((s) => s.count > 0);
    return {
        bySize,
        total: rooms.length,
        beds: rooms.reduce((n, r) => n + r.beds, 0),
        used: units.filter(inRoom).reduce((n, u) => n + u.beds, 0),
        unassigned: units.filter((u) => !inRoom(u)).length,
    };
};

// Pale card colors by number of beds (background + border).
export const BED_COLORS = {
    1: 'bg-slate-50 border-slate-200',
    2: 'bg-sky-50 border-sky-200',
    3: 'bg-emerald-50 border-emerald-200',
    4: 'bg-amber-50 border-amber-200',
    5: 'bg-violet-50 border-violet-200',
};
export const bedColor = (beds) => BED_COLORS[beds] || 'bg-white border-gray-200';

// "2-bed room" for a participant's preferred room, or ''.
export const roomLabel = (p) => (p.preferred_room ? `${p.preferred_room}-bed room` : '');

// Only supporters get a badge; athletes are the default.
export function RoleBadge({ role }) {
    if (role !== 'supporter') return null;
    return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Supporter
        </span>
    );
}

export function CompetitionStatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COMPETITION_STATUS_STYLES[status] || ''}`}>
            {capitalize(status)}
        </span>
    );
}

export function SummaryCard({ label, value, className = 'text-gray-900' }) {
    return (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
            <div className="text-xs sm:text-sm text-gray-600">{label}</div>
            <div className={`text-lg sm:text-2xl font-bold ${className}`}>{value}</div>
        </div>
    );
}

export function Modal({ title, onClose, children, wide = false, extraWide = false }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className={`bg-white rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto ${extraWide ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-md'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
