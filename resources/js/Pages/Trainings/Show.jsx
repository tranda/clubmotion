import { Link, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import { TypeBadge, formatDate, formatSize, isToday } from '../../Components/Trainings/shared';

const isImage = (f) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.mime);
const isPdf = (f) => f.mime === 'application/pdf';

export default function TrainingShow({ training: t }) {
    const { auth } = usePage().props;
    const role = auth.user?.role?.name || 'user';
    const canManage = role === 'admin' || role === 'superuser';

    const images = t.files.filter(isImage);
    const others = t.files.filter((f) => !isImage(f));

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
                        <span className="text-gray-600">{t.date ? formatDate(t.date) : 'Program (no fixed date)'}</span>
                        {isToday(t.date) && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">Today</span>
                        )}
                    </div>
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">{t.title}</h1>

                    {t.description && (
                        <div className="mt-4 text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{t.description}</div>
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

                    {images.length > 0 && (
                        <div className="mt-5 space-y-3">
                            {images.map((f) => (
                                <a key={f.id} href={f.url} target="_blank" rel="noopener" className="block">
                                    <img src={f.url} alt={f.name} loading="lazy" className="w-full rounded-lg border border-gray-200" />
                                </a>
                            ))}
                        </div>
                    )}

                    {!t.description && t.files.length === 0 && (
                        <p className="mt-4 text-sm text-gray-500">No details added yet.</p>
                    )}

                    {t.updated_at && (
                        <p className="mt-5 text-xs text-gray-400">
                            Updated {t.updated_at}{t.updated_by ? ` by ${t.updated_by}` : ''}
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
}
