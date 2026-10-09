import { Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import { StatusBadge, METHOD_LABELS, formatDate, formatMoney } from '../../Components/CompetitionFees/format';

export default function MyPayments({ member, year, payments, availableYears, competitionFees = [] }) {
    const monthNames = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            overdue: 'bg-red-100 text-red-800',
            exempt: 'bg-gray-100 text-gray-800',
        };

        const labels = {
            paid: '✓ Paid',
            pending: '○ Pending',
            overdue: '! Overdue',
            exempt: '− Exempt',
        };

        return (
            <span className={`px-2 py-1 rounded text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const totalPaid = payments.filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payments - {year}</h1>

                {/* Member Info */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold">{member.name}</h2>
                            <p className="text-gray-600 text-sm sm:text-base">Membership #{member.membership_number}</p>
                        </div>
                        <div className="sm:text-right">
                            <div className="text-sm text-gray-600">Total Paid ({year})</div>
                            <div className="text-xl sm:text-2xl font-bold text-green-600">
                                {totalPaid.toLocaleString()} RSD
                            </div>
                        </div>
                    </div>
                </div>

                {/* Year Selector */}
                <div className="mb-4">
                    <select
                        value={year}
                        onChange={(e) => window.location.href = `/my-payments?year=${e.target.value}`}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Payment History - Desktop Table */}
                <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Month
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Method
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {monthNames[payment.payment_month]}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {payment.paid_amount ? `${parseFloat(payment.paid_amount).toLocaleString()} RSD` : '−'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(payment.payment_status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.payment_date || '−'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {payment.payment_method ? payment.payment_method.replace('_', ' ') : '−'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No payment records found for {year}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Payment History - Mobile Card View */}
                <div className="sm:hidden bg-white rounded-lg shadow divide-y divide-gray-200">
                    {payments.length > 0 ? (
                        payments.map((payment) => (
                            <div key={payment.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-900">
                                        {monthNames[payment.payment_month]}
                                    </div>
                                    {getStatusBadge(payment.payment_status)}
                                </div>
                                <div className="text-lg font-semibold text-gray-900 mb-1">
                                    {payment.paid_amount ? `${parseFloat(payment.paid_amount).toLocaleString()} RSD` : '−'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {payment.payment_date || 'No date'}
                                    {payment.payment_method && (
                                        <span className="ml-2 capitalize">• {payment.payment_method.replace('_', ' ')}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-12 text-center text-gray-500">
                            No payment records found for {year}
                        </div>
                    )}
                </div>

                {/* Competition Fees (all years) */}
                {competitionFees.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Competition Fees</h2>
                        <div className="space-y-4">
                            {competitionFees.map((cf) => {
                                const cur = cf.competition.currency;
                                return (
                                    <div key={cf.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                                        <div className="flex justify-between items-start gap-3 mb-3">
                                            <div>
                                                <div className="font-semibold text-gray-900">{cf.competition.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(cf.competition.start_date)}
                                                    {cf.competition.location && ` • ${cf.competition.location}`}
                                                </div>
                                            </div>
                                            <StatusBadge status={cf.payment_status} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <div className="text-gray-500">Fee</div>
                                                <div className="font-medium text-gray-900">{formatMoney(cf.fee_amount, cur)}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Paid</div>
                                                <div className="font-medium text-green-700">{formatMoney(cf.paid_amount, cur)}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">{cf.overpaid_amount > 0 ? 'Overpaid' : 'Remaining'}</div>
                                                <div className={`font-medium ${cf.overpaid_amount > 0 ? 'text-blue-700' : cf.remaining_amount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                                                    {formatMoney(cf.overpaid_amount > 0 ? cf.overpaid_amount : cf.remaining_amount, cur)}
                                                </div>
                                            </div>
                                        </div>
                                        {cf.payments.length > 0 && (
                                            <ul className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
                                                {cf.payments.map((pay) => (
                                                    <li key={pay.id} className="flex justify-between">
                                                        <span>{formatDate(pay.paid_at)} • {METHOD_LABELS[pay.payment_method] || pay.payment_method}</span>
                                                        <span className="font-medium text-gray-900">{formatMoney(pay.amount, cur)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
