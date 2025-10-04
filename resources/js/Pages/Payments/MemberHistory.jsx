import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function MemberHistory({ member, year, payments, availableYears }) {
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
            <div className="py-4 max-w-6xl mx-auto">
                <Link
                    href={route('payments.index')}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Payment Grid
                </Link>

                <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    Payment History - {member.name}
                </h1>

                {/* Member Summary */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <div className="text-sm text-gray-600">Member</div>
                            <div className="text-lg font-semibold">{member.name}</div>
                            <div className="text-sm text-gray-500">#{member.membership_number}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Year</div>
                            <select
                                value={year}
                                onChange={(e) => router.get(route('payments.member', { member: member.id, year: e.target.value }))}
                                className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Total Paid ({year})</div>
                            <div className="text-2xl font-bold text-green-600">
                                {totalPaid.toLocaleString()} RSD
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment History Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Month
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Expected
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Paid
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.expected_amount ? `${parseFloat(payment.expected_amount).toLocaleString()} RSD` : '−'}
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
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No payment records found for {year}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
