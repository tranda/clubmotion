import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';
import { resizeImageIfNeeded } from '../../utils/resizeImage';

export default function Show({ member, recentPayments = [], currentYear, imageHistory = [] }) {
    const { auth } = usePage().props;
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';
    const isSelf = !!(auth.user && member.user_id && member.user_id === auth.user.id);
    const canEditPhoto = canManage || isSelf;
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [resetErrors, setResetErrors] = useState({});
    const [resetting, setResetting] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [emailData, setEmailData] = useState({ subject: '', body: '' });
    const [emailErrors, setEmailErrors] = useState({});
    const [emailSending, setEmailSending] = useState(false);

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

    const fmtDate = (v) => {
        if (!v) return '';
        try {
            return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return v;
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoError(null);

        let finalFile = file;
        try {
            const result = await resizeImageIfNeeded(file);
            finalFile = result.file;
        } catch (err) {
            setPhotoError('Could not process the selected image. Please try a different file.');
            e.target.value = '';
            return;
        }

        setPhotoUploading(true);
        router.post(`/members/${member.id}/image`, { image: finalFile }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setPhotoUploading(false);
                e.target.value = '';
            },
        });
    };

    const revertPhoto = (img) => {
        if (!confirm('Set this photo as the current one?')) return;
        router.post(`/members/${member.id}/image/${img.id}/revert`, {}, { preserveScroll: true });
    };

    const deletePhoto = (img) => {
        if (!confirm('Permanently delete this photo? This cannot be undone.')) return;
        router.delete(`/members/${member.id}/image/${img.id}`, { preserveScroll: true });
    };

    const openEmail = () => {
        setEmailErrors({});
        setEmailData({ subject: '', body: `Hi ${member.name},\n\n` });
        setShowEmail(true);
    };

    const handleSendEmail = (e) => {
        e.preventDefault();
        setEmailErrors({});
        setEmailSending(true);
        router.post(`/members/${member.id}/email`, emailData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowEmail(false);
                setEmailData({ subject: '', body: '' });
            },
            onError: (errors) => setEmailErrors(errors),
            onFinish: () => setEmailSending(false),
        });
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        setResetErrors({});
        setResetting(true);
        router.post(
            `/members/${member.id}/reset-password`,
            { password: newPassword, password_confirmation: newPasswordConfirm },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowResetPassword(false);
                    setNewPassword('');
                    setNewPasswordConfirm('');
                },
                onError: (errors) => setResetErrors(errors),
                onFinish: () => setResetting(false),
            },
        );
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
                    {(member.image || canEditPhoto) && (
                        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col items-center bg-gray-50">
                            {member.image ? (
                                <img
                                    src={`/storage/${member.image}`}
                                    alt={member.name}
                                    className="h-32 w-32 sm:h-48 sm:w-48 rounded-full object-cover shadow-lg"
                                />
                            ) : (
                                <div className="h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shadow-inner">
                                    <svg className="w-16 h-16" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}

                            {canEditPhoto && (
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                                    <label className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                                        {photoUploading ? 'Uploading…' : (member.image ? 'Change photo' : 'Add photo')}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoChange}
                                            disabled={photoUploading}
                                        />
                                    </label>
                                    {canManage && imageHistory.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            {showHistory ? 'Hide history' : `Photo history (${imageHistory.length})`}
                                        </button>
                                    )}
                                </div>
                            )}
                            {photoError && <p className="mt-2 text-sm text-red-600">{photoError}</p>}

                            {canManage && showHistory && imageHistory.length > 0 && (
                                <div className="mt-4 w-full">
                                    <div className="flex flex-wrap gap-4 justify-center">
                                        {imageHistory.map((img) => {
                                            const isCurrent = member.image === img.path;
                                            return (
                                                <div key={img.id} className="w-28 text-center">
                                                    <img
                                                        src={`/storage/${img.path}`}
                                                        alt=""
                                                        className={`h-24 w-24 rounded-lg object-cover mx-auto border-2 ${isCurrent ? 'border-green-500' : 'border-gray-200'}`}
                                                    />
                                                    <p className="text-[11px] text-gray-400 mt-1">
                                                        {fmtDate(img.created_at)}{img.uploader ? ` · ${img.uploader.name}` : ''}
                                                    </p>
                                                    {isCurrent ? (
                                                        <span className="text-[11px] font-medium text-green-600">Current</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => revertPhoto(img)}
                                                            className="text-[11px] text-blue-600 hover:text-blue-800"
                                                        >
                                                            Set current
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePhoto(img)}
                                                        className="block mx-auto text-[11px] text-gray-400 hover:text-red-600 mt-0.5"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
                                onClick={() => setShowResetPassword(true)}
                                className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Reset Password
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Member
                            </button>

                            <button
                                onClick={openEmail}
                                disabled={!member.email}
                                title={member.email ? '' : 'No email address on file'}
                                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed sm:ml-auto"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Send Message
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment History Section */}
                {recentPayments && recentPayments.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Payments ({currentYear})</h2>
                            {canManage ? (
                                <Link
                                    href={`/payments/member/${member.id}`}
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    View All →
                                </Link>
                            ) : (
                                <Link
                                    href="/my-payments"
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
                                        <tr key={payment.payment_month}>
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

                {/* Send Message Modal */}
                {showEmail && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Send message to {member.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">To: {member.email}</p>
                            <form onSubmit={handleSendEmail} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        required
                                        autoFocus
                                    />
                                    {emailErrors.subject && <p className="mt-1 text-sm text-red-600">{emailErrors.subject}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        rows={7}
                                        value={emailData.body}
                                        onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        required
                                    />
                                    {emailErrors.body && <p className="mt-1 text-sm text-red-600">{emailErrors.body}</p>}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={emailSending}
                                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
                                    >
                                        {emailSending ? 'Sending...' : 'Send message'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmail(false)}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Reset Password Modal */}
                {showResetPassword && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Password</h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                Set a new password for <strong>{member.name}</strong>. Share it with the member securely — they can change it themselves after logging in.
                            </p>
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                                    <input
                                        type="text"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        minLength={8}
                                        required
                                        autoFocus
                                    />
                                    {resetErrors.password && (
                                        <p className="mt-1 text-sm text-red-600">{resetErrors.password}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                                    <input
                                        type="text"
                                        value={newPasswordConfirm}
                                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={resetting}
                                        className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-400"
                                    >
                                        {resetting ? 'Saving...' : 'Set Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowResetPassword(false);
                                            setResetErrors({});
                                            setNewPassword('');
                                            setNewPasswordConfirm('');
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
