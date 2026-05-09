import { Link, router } from '@inertiajs/react';
import Layout from '../../../Components/Layout';

const BUCKET_LABELS = { cash: 'Cash', bank: 'Bank', eur: 'EUR' };

function fmt(value) {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnnualReport({ year, totals, monthly, categories, members, availableYears }) {
    const navigate = (newYear) => {
        router.get('/ledger/reports/annual', { year: newYear }, { preserveState: false });
    };

    return (
        <Layout>
            <div className="py-4 max-w-7xl mx-auto">
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-800">Annual Report</h1>
                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={year}
                            onChange={(e) => navigate(Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                            {!availableYears.includes(Number(year)) && <option value={year}>{year}</option>}
                        </select>
                        <a
                            href={`/ledger/reports/annual/pdf?year=${year}`}
                            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Download PDF
                        </a>
                        <a
                            href={`/ledger/reports/annual/excel?year=${year}`}
                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Download Excel
                        </a>
                        <Link href="/ledger" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Ledger</Link>
                    </div>
                </div>

                {/* Year header totals */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {['cash', 'bank', 'eur'].map((b) => (
                        <div key={b} className="bg-white rounded-lg shadow p-4">
                            <div className="text-xs uppercase text-gray-500 font-semibold">{BUCKET_LABELS[b]}</div>
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                <div className="text-gray-600">Opening</div>
                                <div className="text-right tabular-nums">{fmt(totals.opening[b])}</div>
                                <div className="text-green-700">Income</div>
                                <div className="text-right tabular-nums text-green-700">+{fmt(totals.income[b])}</div>
                                <div className="text-red-700">Expenses</div>
                                <div className="text-right tabular-nums text-red-700">-{fmt(totals.expense[b])}</div>
                                <div className="font-semibold border-t border-gray-100 pt-1">Closing</div>
                                <div className={`text-right font-semibold tabular-nums border-t border-gray-100 pt-1 ${totals.closing[b] >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                                    {fmt(totals.closing[b])}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Monthly grid */}
                <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
                    <div className="px-4 py-2 text-xs uppercase text-gray-500 font-semibold border-b">Monthly breakdown</div>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Month</th>
                                <th className="px-3 py-2 text-right" colSpan="3">Income</th>
                                <th className="px-3 py-2 text-right" colSpan="3">Expense</th>
                                <th className="px-3 py-2 text-right" colSpan="3">Closing</th>
                            </tr>
                            <tr className="bg-gray-50 text-gray-500 text-xs">
                                <th></th>
                                <th className="px-3 py-1 text-right font-normal">Cash</th>
                                <th className="px-3 py-1 text-right font-normal">Bank</th>
                                <th className="px-3 py-1 text-right font-normal">EUR</th>
                                <th className="px-3 py-1 text-right font-normal">Cash</th>
                                <th className="px-3 py-1 text-right font-normal">Bank</th>
                                <th className="px-3 py-1 text-right font-normal">EUR</th>
                                <th className="px-3 py-1 text-right font-normal">Cash</th>
                                <th className="px-3 py-1 text-right font-normal">Bank</th>
                                <th className="px-3 py-1 text-right font-normal">EUR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthly.map((m) => (
                                <tr key={m.month} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2">{m.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(m.income.cash)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(m.income.bank)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(m.income.eur)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmt(m.expense.cash)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmt(m.expense.bank)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmt(m.expense.eur)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.closing.cash)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.closing.bank)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.closing.eur)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Categories */}
                <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
                    <div className="px-4 py-2 text-xs uppercase text-gray-500 font-semibold border-b">Per category</div>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Category</th>
                                <th className="px-3 py-2 text-right">Income</th>
                                <th className="px-3 py-2 text-right">Expense</th>
                                <th className="px-3 py-2 text-right">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 && (
                                <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-400">No data for {year}.</td></tr>
                            )}
                            {categories.map((c, i) => (
                                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2">{c.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{fmt(c.income_total)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmt(c.expense_total)}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${c.net >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                                        {fmt(c.net)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Members */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <div className="px-4 py-2 text-xs uppercase text-gray-500 font-semibold border-b">Member contributions (income)</div>
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <th className="px-3 py-2 text-left">Member</th>
                                <th className="px-3 py-2 text-right">Membership</th>
                                <th className="px-3 py-2 text-right">Registration</th>
                                <th className="px-3 py-2 text-right">Other</th>
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 && (
                                <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-400">No member-linked income for {year}.</td></tr>
                            )}
                            {members.map((m) => (
                                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2">{m.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.membership)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.registration)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{fmt(m.other)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(m.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
