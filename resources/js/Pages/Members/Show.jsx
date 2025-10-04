import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';

export default function Show({ member, recentPayments = [], currentYear }) {
    const { auth } = usePage().props;
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const monthNames = {
        1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR',
        5: 'MAY', 6: 'JUN', 7: 'JUL', 8: 'AUG',
        9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
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
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const handleDelete = () => {
        router.delete(`/members/${member.id}`, {
            onSuccess: () => {
                // Redirect handled by controller
            },
        });
    };

    return (
        <Layout>
            <div className="py-4">
                {/* Header */}
                <div className="mb-6">
                    {canManage && (
                        <Link
                            href="/members"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
                        >
                            <svg className="w-5 h-5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Members
                        </Link>
                    )}
                    <h1 className="text-2xl font-bold text-gray-800">{member.name}'s Details</h1>
                </div>

                {/* Member Card */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Member Image */}
                    {member.image && (
                        <div className="p-6 border-b border-gray-200 flex justify-center bg-gray-50">
                            <img
                                src={`/storage/${member.image}`}
                                alt={member.name}
                                className="h-48 w-48 rounded-full object-cover shadow-lg"
                            />
                        </div>
                    )}

                    {/* Member Details */}
                    <div className="p-6">
                        <dl className="divide-y divide-gray-200">
                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Name</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{member.name}</dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Membership ID</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{member.membership_number}</dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{member.date_of_birth || 'N/A'}</dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Address</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{member.address || 'N/A'}</dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <a href={`tel:${member.phone}`} className="text-blue-600 hover:text-blue-800">
                                        {member.phone || 'N/A'}
                                    </a>
                                </dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <a href={`mailto:${member.email}`} className="text-blue-600 hover:text-blue-800">
                                        {member.email || 'N/A'}
                                    </a>
                                </dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Category</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {member.category?.category_name || 'N/A'}
                                    </span>
                                </dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Medical Validity</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{member.medical_validity || 'N/A'}</dd>
                            </div>

                            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                                <dt className="text-sm font-medium text-gray-500">Active Status</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {member.is_active ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            ✅ Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                            ❌ Inactive
                                        </span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Action Buttons - Admin/Superuser only */}
                    {canManage && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                            <Link
                                href={`/members/${member.id}/edit`}
                                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Member
                            </Link>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Member
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment History Section */}
                {recentPayments && recentPayments.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Payments ({currentYear})</h2>
                            {canManage ? (
                                <Link
                                    href={route('payments.member', member.id)}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    View All →
                                </Link>
                            ) : (
                                <Link
                                    href={route('payments.mine')}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    View All →
                                </Link>
                            )}
                        </div>
                        <div className="p-6">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Month</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentPayments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="py-3 text-sm font-medium text-gray-900">
                                                {monthNames[payment.payment_month]}
                                            </td>
                                            <td className="py-3 text-sm text-gray-900">
                                                {payment.paid_amount ? `${parseFloat(payment.paid_amount).toLocaleString()} RSD` : '−'}
                                            </td>
                                            <td className="py-3">
                                                {getStatusBadge(payment.payment_status)}
                                            </td>
                                            <td className="py-3 text-sm text-gray-500">
                                                {payment.payment_date || '−'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{member.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
