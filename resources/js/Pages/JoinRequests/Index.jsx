import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';

const STATUS_STYLES = {
    pending:    'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    approved:   'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
    pending:    'Pending',
    processing: 'Processing',
    approved:   'Approved',
    rejected:   'Rejected',
};

function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return value;
    }
}

export default function JoinRequestsIndex({ requests, filter, counts }) {
    const { flash } = usePage().props;
    const [emailFor, setEmailFor] = useState(null); // request object we're emailing
    const [emailData, setEmailData] = useState({ subject: '', body: '' });
    const [emailStatus, setEmailStatus] = useState(null); // status to apply on send (e.g. 'rejected'), or null for a plain email
    const [busyId, setBusyId] = useState(null);

    const changeFilter = (value) => {
        router.get('/join-requests', { status: value }, { preserveState: true, preserveScroll: true });
    };

    const setStatus = (req, status) => {
        if (status === 'rejected' && !confirm(`Reject the request from ${req.name}?`)) return;
        setBusyId(req.id);
        router.patch(`/join-requests/${req.id}/status`, { status }, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const approve = (req) => {
        if (!confirm(`Create a member account for ${req.name} (${req.email})?`)) return;
        setBusyId(req.id);
        router.post(`/join-requests/${req.id}/approve`, {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const destroy = (req) => {
        if (!confirm(`Delete the request from ${req.name}? This cannot be undone.`)) return;
        setBusyId(req.id);
        router.delete(`/join-requests/${req.id}`, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const openEmail = (req) => {
        setEmailStatus(null);
        setEmailFor(req);
        setEmailData({
            subject: `Your request to join`,
            body: `Hi ${req.name},\n\n`,
        });
    };

    const openReject = (req) => {
        setEmailStatus('rejected');
        setEmailFor(req);
        setEmailData({
            subject: `Regarding your request to join`,
            body: `Hi ${req.name},\n\n`
                + `Thank you for your interest in joining us. After reviewing your request, `
                + `we're unable to offer you a place at this time.\n\n`
                + `We wish you all the best.\n\n`
                + `Kind regards,\nThe team`,
        });
    };

    const closeModal = () => {
        setEmailFor(null);
        setEmailStatus(null);
    };

    const sendEmail = (e) => {
        e.preventDefault();
        router.post(`/join-requests/${emailFor.id}/email`, {
            ...emailData,
            set_status: emailStatus || '',
        }, {
            preserveScroll: true,
            onSuccess: closeModal,
        });
    };

    // Reject without sending an email (fallback from the reject dialog).
    const rejectWithoutEmail = () => {
        const req = emailFor;
        closeModal();
        setBusyId(req.id);
        router.patch(`/join-requests/${req.id}/status`, { status: 'rejected' }, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const FILTERS = [
        { key: 'open', label: `Open (${counts.pending + counts.processing})` },
        { key: 'pending', label: `Pending (${counts.pending})` },
        { key: 'processing', label: `Processing (${counts.processing})` },
        { key: 'approved', label: `Approved (${counts.approved})` },
        { key: 'rejected', label: `Rejected (${counts.rejected})` },
        { key: 'all', label: 'All' },
    ];

    return (
        <Layout>
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Join Requests</h1>
                </div>

                {flash?.success && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg text-sm">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {flash.error}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => changeFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                filter === f.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {requests.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                        No requests here.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div key={req.id} className="bg-white rounded-xl shadow p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-800">{req.name}</h3>
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <a href={`mailto:${req.email}`} className="text-blue-600 hover:underline text-sm">
                                            {req.email}
                                        </a>
                                        <div className="text-sm text-gray-500 mt-1">
                                            {req.date_of_birth && <span>Born {formatDate(req.date_of_birth)} · </span>}
                                            Requested {formatDate(req.created_at)}
                                        </div>
                                    </div>
                                    {req.member_id && (
                                        <a
                                            href={`/members/${req.member_id}`}
                                            className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full hover:bg-green-100"
                                        >
                                            View member →
                                        </a>
                                    )}
                                </div>

                                {req.message && (
                                    <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-line">
                                        {req.message}
                                    </p>
                                )}

                                {req.resolved_at && (
                                    <p className="mt-2 text-xs text-gray-400">
                                        Resolved {formatDate(req.resolved_at)}
                                        {req.resolver ? ` by ${req.resolver.name}` : ''}
                                    </p>
                                )}

                                {req.emails_sent > 0 && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        ✉ Emailed {req.emails_sent} time{req.emails_sent > 1 ? 's' : ''}, last {formatDate(req.last_emailed_at)}
                                        {req.last_email_subject ? ` — "${req.last_email_subject}"` : ''}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {!req.member_id && req.status !== 'rejected' && (
                                        <button
                                            onClick={() => approve(req)}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Create account
                                        </button>
                                    )}
                                    {req.status !== 'processing' && req.status !== 'approved' && req.status !== 'rejected' && (
                                        <button
                                            onClick={() => setStatus(req, 'processing')}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            Mark processing
                                        </button>
                                    )}
                                    {req.status !== 'rejected' && !req.member_id && (
                                        <button
                                            onClick={() => openReject(req)}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    )}
                                    {req.status === 'rejected' && (
                                        <button
                                            onClick={() => setStatus(req, 'pending')}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                                        >
                                            Reopen
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEmail(req)}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    >
                                        Email
                                    </button>
                                    <button
                                        onClick={() => destroy(req)}
                                        disabled={busyId === req.id}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-400 hover:text-red-600 ml-auto disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Email modal */}
            {emailFor && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            {emailStatus === 'rejected' ? `Reject & notify ${emailFor.name}` : `Email ${emailFor.name}`}
                        </h3>
                        {emailStatus === 'rejected' && (
                            <p className="text-sm text-gray-500 mb-1">
                                This will mark the request as <span className="font-medium text-red-600">rejected</span> and email the applicant. Edit the message below.
                            </p>
                        )}
                        <p className="text-sm text-gray-500 mb-1">To: {emailFor.email}</p>
                        {emailFor.emails_sent > 0 && (
                            <p className="text-xs text-gray-400 mb-4">
                                Already emailed {emailFor.emails_sent} time{emailFor.emails_sent > 1 ? 's' : ''}, last {formatDate(emailFor.last_emailed_at)}.
                            </p>
                        )}
                        {!emailFor.emails_sent && <div className="mb-4" />}
                        <form onSubmit={sendEmail} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={emailData.subject}
                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    rows={7}
                                    value={emailData.body}
                                    onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                {emailStatus === 'rejected' && (
                                    <button
                                        type="button"
                                        onClick={rejectWithoutEmail}
                                        className="px-4 py-2 text-sm font-medium rounded-lg text-red-700 hover:bg-red-50 mr-auto"
                                    >
                                        Reject without email
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
                                        emailStatus === 'rejected'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {emailStatus === 'rejected' ? 'Reject & send email' : 'Send email'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
