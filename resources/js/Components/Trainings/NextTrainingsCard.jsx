import { Link } from '@inertiajs/react';
import { TypeBadge, formatDate, isToday, todayIso } from './shared';

// Home page tiles: the next water and gym training, so members can read them before they come.
// Returns tiles only; the Home page puts them in its grid.
export default function NextTrainingsCard({ trainings = [] }) {
    if (trainings.length === 0) {
        return (
            <Link href="/trainings" className="flex flex-col justify-center rounded-lg border border-dashed border-gray-300 p-4 hover:bg-white transition-colors">
                <span className="text-xs text-gray-500">No upcoming trainings yet. Calendar →</span>
            </Link>
        );
    }

    return trainings.map((t) => (
        <Link
            key={t.id}
            href={`/trainings/${t.id}`}
            className={`flex min-w-0 flex-col rounded-lg border p-4 transition-colors ${
                t.type === 'gym'
                    ? 'border-orange-200 bg-orange-50 hover:bg-orange-100/70'
                    : 'border-sky-200 bg-sky-50 hover:bg-sky-100/70'
            }`}
        >
            <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <TypeBadge type={t.type} />
                <span className="font-medium text-gray-700">{whenLabel(t.date)}</span>
            </span>
            <span className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{t.title}</span>
            {t.preview && <span className="mt-1 line-clamp-2 text-xs text-gray-500">{t.preview}</span>}
        </Link>
    ));
}

function whenLabel(iso) {
    if (isToday(iso)) return 'Today';
    const [y, m, d] = todayIso().split('-').map(Number);
    const tomorrow = new Date(y, m - 1, d + 1);
    const tIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return iso === tIso ? 'Tomorrow' : formatDate(iso);
}
