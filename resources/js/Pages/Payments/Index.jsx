import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Index({ year, members, stats, availableYears, filter }) {
    const { auth } = usePage().props;
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const handleYearChange = (newYear) => {
        const currentFilter = filter || 'active';
        router.get(`/payments?year=${newYear}&filter=${currentFilter}`);
    };

    const handleFilterChange = (e) => {
        const value = e.target.value;
        router.get(`/payments?year=${year}&filter=${value}`);
    };

    const handleCellClick = (member, month, payment) => {
        setSelectedPayment({
            ...payment,
            member_id: member.id,
            member_name: member.name,
            month: month,
            month_name: monthNames[month - 1],
        });
        setShowEditModal(true);
    };

    const getStatusColor = (payment) => {
        if (!payment) return 'bg-gray-50 border-gray-200';

        switch (payment.status) {
            case 'paid':
                return 'bg-green-50 border-green-300 text-green-900';
            case 'pending':
                return 'bg-yellow-50 border-yellow-300 text-yellow-900';
            case 'overdue':
                return 'bg-red-50 border-red-300 text-red-900';
            case 'exempt':
                return 'bg-gray-100 border-gray-400 text-gray-600';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getCellContent = (payment, member) => {
        if (!payment) return '';

        if (payment.status === 'exempt') {
            return payment.exemption === 'pocasni' ? 'POC' : 'SAR';
        }

        if (payment.status === 'paid') {
            return (payment.amount / 1000).toFixed(1) + 'k';
        }

        return payment.status === 'overdue' ? '!' : '○';
    };

    return (
        <Layout>
            <div className="py-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Payments Management - {year}</h1>

                    <div className="flex gap-2">
                        <select
                            value={filter === undefined || filter === null ? 'active' : filter}
                            onChange={handleFilterChange}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                        </select>

                        <select
                            value={year}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <Link
                            href={`/payments/export-template/${year}`}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            📥 Download Template
                        </Link>

                        <Link
                            href="/payments/import"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            📤 Import CSV
                        </Link>

                        <Link
                            href={`/payments/initialize?year=${year + 1}`}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            ➕ Initialize Year
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Total Collected</div>
                        <div className="text-2xl font-bold text-green-600">
                            {Number(stats?.total_collected || 0).toLocaleString()} RSD
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Paid</div>
                        <div className="text-2xl font-bold text-green-600">{stats?.paid_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Pending</div>
                        <div className="text-2xl font-bold text-yellow-600">{stats?.pending_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Overdue</div>
                        <div className="text-2xl font-bold text-red-600">{stats?.overdue_count || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Exempt</div>
                        <div className="text-2xl font-bold text-gray-600">{stats?.exempt_count || 0}</div>
                    </div>
                </div>

                {/* Payment Grid */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                                        Member
                                    </th>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        #
                                    </th>
                                    {monthNames.map((month, idx) => (
                                        <th key={idx} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                            {month}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {members.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                            {member.name}
                                            {member.exemption_status !== 'none' && (
                                                <span className="ml-2 text-xs text-gray-500">
                                                    ({member.exemption_status})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-gray-500">
                                            {member.membership_number}
                                        </td>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                                            const payment = member.months[month];
                                            return (
                                                <td
                                                    key={month}
                                                    onClick={() => handleCellClick(member, month, payment)}
                                                    className={`px-2 py-2 text-center text-xs font-semibold border cursor-pointer hover:opacity-75 ${getStatusColor(payment)}`}
                                                >
                                                    {getCellContent(payment, member)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-200 border border-green-300"></div>
                        <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-200 border border-yellow-300"></div>
                        <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-200 border border-red-300"></div>
                        <span>Overdue</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 border border-gray-400"></div>
                        <span>Exempt</span>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && <PaymentEditModal
                payment={selectedPayment}
                year={year}
                onClose={() => setShowEditModal(false)}
                canDelete={auth.user.role_id === 1 || auth.user.role_id === 2}
            />}
        </Layout>
    );
}

function PaymentEditModal({ payment, year, onClose, canDelete }) {
    const [formData, setFormData] = useState({
        paid_amount: payment?.amount || '',
        payment_status: payment?.status || 'pending',
        payment_method: payment?.method || 'cash',
        payment_date: payment?.date || new Date().toISOString().split('T')[0],
        notes: '',
        exemption_reason: payment?.exemption || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (payment?.id) {
            router.put(`/payments/${payment.id}`, formData, {
                onSuccess: () => onClose(),
            });
        }
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this payment record?')) {
            router.delete(`/payments/${payment.id}`, {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">
                    Update Payment - {payment.member_name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{payment.month_name} {year}</p>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount (RSD)</label>
                            <input
                                type="number"
                                value={formData.paid_amount}
                                onChange={(e) => setFormData({...formData, paid_amount: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                value={formData.payment_status}
                                onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="exempt">Exempt</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>

                        {formData.payment_status === 'exempt' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Exemption Reason</label>
                                <select
                                    value={formData.exemption_reason}
                                    onChange={(e) => setFormData({...formData, exemption_reason: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Select...</option>
                                    <option value="pocasni">Pocasni</option>
                                    <option value="saradnik">Saradnik</option>
                                </select>
                            </div>
                        )}

                        {formData.payment_status === 'paid' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                    <select
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                                    <input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between">
                        <div>
                            {canDelete && payment?.id && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Save Payment
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}