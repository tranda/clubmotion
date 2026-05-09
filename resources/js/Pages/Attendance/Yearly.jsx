import { Link, router } from '@inertiajs/react';
import { useMemo } from 'react';
import Layout from '../../Components/Layout';

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function AttendanceYearly({
    year, rows, sessionsPerMonth, sessionsTotalYear,
    availableYears, sessionTypes, sessionTypeFilter, filter,
}) {
    const navigate = (params) => {
        router.get('/attendance/yearly', { year, sessionTypeFilter, filter, ...params }, { preserveState: false });
    };

    const totalsByMember = useMemo(() => rows.reduce((acc, r) => acc + (r.total ?? 0), 0), [rows]);

    return (
        <Layout>
            <div className="py-4 max-w-7xl mx-auto">
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-800">Attendance — Yearly</h1>
                        <Link href="/attendance" className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                            Monthly view
                        </Link>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={year}
                            onChange={(e) => navigate({ year: Number(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                            {!availableYears.includes(Number(year)) && <option value={year}>{year}</option>}
                        </select>
                        <select
                            value={sessionTypeFilter ?? ''}
                            onChange={(e) => navigate({ session_type_id: e.target.value || null })}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">All session types</option>
                            {sessionTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select
                            value={filter ?? 'active'}
                            onChange={(e) => navigate({ filter: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="active">Active members</option>
                            <option value="all">All members</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50 z-10">Member</th>
                                <th className="px-3 py-2 text-right">#</th>
                                {MONTH_LABELS.map((m) => (
                                    <th key={m} className="px-2 py-2 text-center font-semibold">{m}</th>
                                ))}
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-500 text-xs border-t border-gray-100">
                                <th className="px-3 py-1 text-left sticky left-0 bg-gray-50 z-10 font-normal">Sessions held</th>
                                <th></th>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <th key={m} className="px-2 py-1 text-center font-normal">{sessionsPerMonth[m] ?? 0}</th>
                                ))}
                                <th className="px-3 py-1 text-right font-normal">{sessionsTotalYear}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan="15" className="px-3 py-6 text-center text-gray-400">No members.</td></tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 sticky left-0 bg-white hover:bg-gray-50 whitespace-nowrap">
                                        <Link href={`/members/${r.id}`} className="text-gray-900 hover:text-blue-600">
                                            {r.name}
                                        </Link>
                                        {r.category && <span className="ml-2 text-xs text-gray-400">{r.category}</span>}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs text-gray-500 tabular-nums">{r.membership_number}</td>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                                        const c = r.months[m] ?? 0;
                                        return (
                                            <td
                                                key={m}
                                                className={`px-2 py-2 text-center tabular-nums ${c === 0 ? 'text-gray-300' : 'text-gray-900'}`}
                                            >
                                                {c}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{r.total}</td>
                                </tr>
                            ))}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                                    <td className="px-3 py-2 text-right uppercase text-xs text-gray-600 sticky left-0 bg-gray-50" colSpan="2">Total attendances</td>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                                        const monthSum = rows.reduce((acc, r) => acc + (r.months[m] ?? 0), 0);
                                        return (
                                            <td key={m} className="px-2 py-2 text-center tabular-nums">{monthSum}</td>
                                        );
                                    })}
                                    <td className="px-3 py-2 text-right tabular-nums">{totalsByMember}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </Layout>
    );
}
