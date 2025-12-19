import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Index({ year, members, stats, availableYears, filter, annualConfig }) {
    const { auth } = usePage().props;
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnnualModal, setShowAnnualModal] = useState(false);
    const [selectedMemberForAnnual, setSelectedMemberForAnnual] = useState(null);

    // Pull to refresh
    useEffect(() => {
        let startY = 0;
        let isPulling = false;

        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling) return;
            const currentY = e.touches[0].pageY;
            const pullDistance = currentY - startY;
            if (pullDistance > 100) {
                isPulling = false;
                router.reload();
            }
        };

        const handleTouchEnd = () => {
            isPulling = false;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

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

    const handleAnnualClick = (member) => {
        setSelectedMemberForAnnual(member);
        setShowAnnualModal(true);
    };

    const getStatusColor = (payment) => {
        if (!payment) return 'bg-gray-50 border-gray-200';

        // Annual payments get purple styling
        if (payment.is_annual) {
            return 'bg-purple-50 border-purple-300 text-purple-900';
        }

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

        // Null status = initialized but not processed yet (show empty)
        if (!payment.status) return '';

        if (payment.status === 'exempt') {
            if (payment.exemption === 'pocasni') return 'POC';
            if (payment.exemption === 'saradnik') return 'SAR';
            return 'OTH'; // For 'other' or any other exemption type
        }

        if (payment.status === 'paid') {
            // Annual payments: show amount with "A" suffix for first month, just "A" for others
            if (payment.is_annual) {
                return payment.amount > 0 ? `${Math.round(payment.amount)}A` : 'A';
            }
            return Math.round(payment.amount);
        }

        return payment.status === 'overdue' ? '!' : '○';
    };

    return (
        <Layout>
            <div className="py-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Payments - {year}</h1>

                    <div className="flex flex-wrap gap-2">
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
                            className="hidden sm:inline-flex px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            📥 Download
                        </Link>

                        <Link
                            href="/payments/import"
                            className="hidden sm:inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            📤 Import
                        </Link>

                        <Link
                            href={`/payments/initialize?year=${year + 1}`}
                            className="hidden sm:inline-flex px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            ➕ Initialize
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow col-span-2 sm:col-span-1">
                        <div className="text-xs sm:text-sm text-gray-600">Total Collected</div>
                        <div className="text-lg sm:text-2xl font-bold text-green-600">
                            {Number(stats?.total_collected || 0).toLocaleString()} RSD
                        </div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                        <div className="text-xs sm:text-sm text-gray-600">Paid</div>
                        <div className="text-lg sm:text-2xl font-bold text-green-600">{stats?.paid_count || 0}</div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                        <div className="text-xs sm:text-sm text-gray-600">Pending</div>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats?.pending_count || 0}</div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                        <div className="text-xs sm:text-sm text-gray-600">Overdue</div>
                        <div className="text-lg sm:text-2xl font-bold text-red-600">{stats?.overdue_count || 0}</div>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                        <div className="text-xs sm:text-sm text-gray-600">Exempt</div>
                        <div className="text-lg sm:text-2xl font-bold text-gray-600">{stats?.exempt_count || 0}</div>
                    </div>
                </div>

                {/* Payment Grid - Desktop Table */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                        Annual
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
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={() => handleAnnualClick(member)}
                                                className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                                                title={`Pay Annual: ${Number(annualConfig?.annual_amount || 32000).toLocaleString()} RSD`}
                                            >
                                                A
                                            </button>
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

                {/* Payment Grid - Mobile Card View */}
                <div className="md:hidden bg-white rounded-lg shadow divide-y divide-gray-200">
                    {members.map((member) => (
                        <div key={member.id} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="font-medium text-gray-900">{member.name}</div>
                                    <div className="text-sm text-gray-500">
                                        #{member.membership_number}
                                        {member.exemption_status !== 'none' && (
                                            <span className="ml-2">({member.exemption_status})</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAnnualClick(member)}
                                    className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                                >
                                    Annual
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
                                    const payment = member.months[month];
                                    return (
                                        <button
                                            key={month}
                                            onClick={() => handleCellClick(member, month, payment)}
                                            className={`px-2 py-2 text-xs font-medium rounded border text-center ${getStatusColor(payment)}`}
                                        >
                                            <div className="text-[10px] text-gray-500">{monthNames[month - 1]}</div>
                                            <div>{getCellContent(payment, member) || '-'}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-4 flex gap-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-200 border border-green-300"></div>
                        <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-200 border border-purple-300"></div>
                        <span>Annual</span>
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

            {/* Annual Payment Modal */}
            {showAnnualModal && <AnnualPaymentModal
                member={selectedMemberForAnnual}
                year={year}
                annualConfig={annualConfig}
                onClose={() => setShowAnnualModal(false)}
            />}
        </Layout>
    );
}

function PaymentEditModal({ payment, year, onClose, canDelete }) {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Convert date from d.m.Y format (from backend) to Y-m-d format (for input field)
    const convertDateToInputFormat = (dateStr) => {
        if (!dateStr) return today;

        // Check if date is in d.m.Y format (e.g., "23.10.2025")
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        // If already in Y-m-d format or unknown format, return as is
        return dateStr;
    };

    const [formData, setFormData] = useState({
        paid_amount: payment?.amount || payment?.expected || '',
        payment_status: payment?.status || 'paid',
        payment_method: payment?.method || 'cash',
        payment_date: convertDateToInputFormat(payment?.date),
        notes: '',
        exemption_reason: payment?.exemption || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            member_id: payment.member_id,
            payment_month: payment.month,
            payment_year: year,
            // Ensure payment_date is sent only if it has a value
            payment_date: formData.payment_date || null,
        };

        // Always POST - backend handles create or update with updateOrCreate
        router.post('/payments', submitData, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this payment record?')) {
            router.delete(`/payments/${payment.id}`, {
                preserveScroll: true,
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
                            <label className="block text-sm font-medium text-gray-700">
                                Amount (RSD)
                                {payment?.expected && (
                                    <span className="ml-2 text-xs font-normal text-gray-500">
                                        Expected: {Number(payment.expected).toLocaleString()}
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                value={formData.paid_amount}
                                onChange={(e) => setFormData({...formData, paid_amount: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                value={formData.payment_status}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setFormData({
                                        ...formData,
                                        payment_status: newStatus,
                                        // Set today's date when status changes to 'paid' if date is empty
                                        payment_date: newStatus === 'paid' && !formData.payment_date ? today : formData.payment_date
                                    });
                                }}
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
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        )}

                        {formData.payment_status === 'paid' && (
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
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input
                                type="date"
                                value={formData.payment_date}
                                onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

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
                            {payment?.id && (
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

function AnnualPaymentModal({ member, year, annualConfig, onClose }) {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;

    const [formData, setFormData] = useState({
        start_month: currentMonth,
        start_year: year,
        payment_method: 'cash',
        payment_date: today,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    // Calculate end month/year (12 months from start)
    const getEndDate = () => {
        let endMonth = formData.start_month + 11;
        let endYear = formData.start_year;
        if (endMonth > 12) {
            endMonth -= 12;
            endYear++;
        }
        return { month: endMonth, year: endYear };
    };

    const endDate = getEndDate();
    const annualAmount = annualConfig?.annual_amount || 32000;

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/payments/annual', {
            member_id: member.id,
            start_year: formData.start_year,
            start_month: formData.start_month,
            payment_method: formData.payment_method,
            payment_date: formData.payment_date,
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">
                    Annual Payment - {member.name}
                </h3>

                <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
                    <p className="text-sm text-purple-700">
                        <strong>Amount:</strong> {Number(annualAmount).toLocaleString()} RSD
                    </p>
                    <p className="text-sm text-purple-700">
                        <strong>Coverage:</strong> 12 months
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Month</label>
                                <select
                                    value={formData.start_month}
                                    onChange={(e) => setFormData({...formData, start_month: parseInt(e.target.value)})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {monthNames.map((month, idx) => (
                                        <option key={idx} value={idx + 1}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Year</label>
                                <select
                                    value={formData.start_year}
                                    onChange={(e) => setFormData({...formData, start_year: parseInt(e.target.value)})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    {[year - 1, year, year + 1].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded text-sm">
                            <strong>Coverage period:</strong><br />
                            {monthNames[formData.start_month - 1]} {formData.start_year} → {monthNames[endDate.month - 1]} {endDate.year}
                        </div>

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
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : `Pay ${Number(annualAmount).toLocaleString()} RSD`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}