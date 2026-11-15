// Small helpers shared by the Trainings pages.

export const TYPE_LABELS = { water: 'Water', gym: 'Gym' };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-11-15" → "Sun 15.11.2026" (read as a local date, no timezone shift).
export function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${DAYS[date.getDay()]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isToday(iso) {
    return !!iso && iso === todayIso();
}

export function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TypeBadge({ type }) {
    const cls = type === 'gym' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
            {type === 'gym' ? '🏋️' : '🚣'} {TYPE_LABELS[type] || type}
        </span>
    );
}
