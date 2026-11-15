import { Link } from '@inertiajs/react';
import { TypeBadge, formatDate, isToday, todayIso } from './shared';

// Home page: the next water and gym training, so members can read them before they come.
export default function NextTrainingsCard({ trainings = [] }) {
    return (
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Next training</h3>
                <Link href="/trainings" className="text-sm text-blue-600 hover:underline">Calendar →</Link>
            </div>

            {trainings.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming trainings yet.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {trainings.map((t) => (
                        <Link
                            key={t.id}
                            href={`/trainings/${t.id}`}
                            className={`block rounded-lg border p-4 hover:shadow-md transition-shadow ${
                                t.type === 'gym' ? 'border-orange-200 bg-orange-50/50' : 'border-sky-200 bg-sky-50/50'
                            }`}
                        >
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <TypeBadge type={t.type} />
                                <span className="font-medium text-gray-700">{whenLabel(t.date)}</span>
                                {t.files_count > 0 && <span className="ml-auto text-xs text-gray-500">📎 {t.files_count}</span>}
                            </div>
                            <div className="mt-1.5 font-semibold text-gray-900">{t.title}</div>
                            {t.preview && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{t.preview}</p>}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function whenLabel(iso) {
    if (isToday(iso)) return 'Today';
    const [y, m, d] = todayIso().split('-').map(Number);
    const tomorrow = new Date(y, m - 1, d + 1);
    const tIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return iso === tIso ? `Tomorrow · ${formatDate(iso)}` : formatDate(iso);
}
