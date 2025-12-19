import { Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function MyPayments({ member, year, payments, availableYears }) {
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
            </div>
        </Layout>
    );
}
