import { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import PaymentsTabs from '../../Components/CompetitionFees/PaymentsTabs';
import CompetitionFormModal from '../../Components/CompetitionFees/CompetitionFormModal';
import { formatMoney, CompetitionStatusBadge, SummaryCard } from '../../Components/CompetitionFees/format';

export default function CompetitionFees({ year, status, availableYears, competitions, summary, counts, currencies }) {
    const [showForm, setShowForm] = useState(false);

    const applyFilters = (next) => {
        router.get('/payments/competition-fees', { year, status, ...next }, { preserveState: true });
    };

    const open = (id) => router.get(`/payments/competition-fees/${id}`);

    // One line per currency (EUR and RSD are never added together).
    const moneyCard = (key) =>
        summary.length === 0 ? '—' : (
            <div className="space-y-0.5">
                {summary.map((s) => <div key={s.currency}>{formatMoney(s[key], s.currency)}</div>)}
            </div>
        );

    return (
        <Layout>
            <div className="py-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Payments - {year}</h1>
                </div>

                <PaymentsTabs active="competition" />

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Competition Fees - {year}</h2>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={status}
                            onChange={(e) => applyFilters({ status: e.target.value })}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                            <option value="all">All</option>
                        </select>
                        <select
                            value={year}
                            onChange={(e) => applyFilters({ year: e.target.value })}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            + Add Competition
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Expected" value={moneyCard('expected')} className="text-gray-900 text-base sm:text-lg" />
                    <SummaryCard label="Collected" value={moneyCard('collected')} className="text-green-600 text-base sm:text-lg" />
                    <SummaryCard label="Remaining" value={moneyCard('remaining')} className="text-red-600 text-base sm:text-lg" />
                    <SummaryCard label="Competitions" value={counts.competitions} />
                    <SummaryCard label="Participants" value={counts.participants} />
                </div>

                {competitions.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        No competitions for {year}{status !== 'all' ? ` (${status})` : ''}.
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Competition', 'Date', 'Participants', 'Expected', 'Collected', 'Remaining', 'Status'].map((h, i) => (
                                            <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${i >= 2 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {competitions.map((c) => (
                                        <tr key={c.id} onClick={() => open(c.id)} className="hover:bg-gray-50 cursor-pointer">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {c.name}
                                                {c.location && <div className="text-xs text-gray-500">{c.location}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{c.date_range || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{c.totals.participants}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatMoney(c.totals.expected, c.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-green-700 text-right whitespace-nowrap">{formatMoney(c.totals.collected, c.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-red-700 text-right whitespace-nowrap">{formatMoney(c.totals.remaining, c.currency)}</td>
                                            <td className="px-4 py-3 text-sm"><CompetitionStatusBadge status={c.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {competitions.map((c) => (
                                <div key={c.id} onClick={() => open(c.id)} className="bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-semibold text-gray-900">{c.name}</div>
                                            <div className="text-sm text-gray-500">{c.date_range || '—'}</div>
                                        </div>
                                        <CompetitionStatusBadge status={c.status} />
                                    </div>
                                    <div className="mt-2 text-sm text-gray-700 space-y-0.5">
                                        <div>{c.totals.participants} participants</div>
                                        <div>{formatMoney(c.totals.expected, c.currency)} expected</div>
                                        <div className="text-green-700">{formatMoney(c.totals.collected, c.currency)} collected</div>
                                        <div className="text-red-700">{formatMoney(c.totals.remaining, c.currency)} remaining</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showForm && <CompetitionFormModal currencies={currencies} onClose={() => setShowForm(false)} />}
        </Layout>
    );
}
