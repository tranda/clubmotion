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
        setEmailFor(req);
        setEmailData({
            subject: `Your request to join`,
            body: `Hi ${req.name},\n\n`,
        });
    };

    const sendEmail = (e) => {
        e.preventDefault();
        router.post(`/join-requests/${emailFor.id}/email`, emailData, {
            preserveScroll: true,
            onSuccess: () => setEmailFor(null),
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

                                {/* Actions */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {!req.member_id && (
                                        <button
                                            onClick={() => approve(req)}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Create account
                                        </button>
                                    )}
                                    {req.status !== 'processing' && req.status !== 'approved' && (
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
                                            onClick={() => setStatus(req, 'rejected')}
                                            disabled={busyId === req.id}
                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                        >
                                            Reject
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
                    onClick={() => setEmailFor(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Email {emailFor.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">To: {emailFor.email}</p>
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
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEmailFor(null)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Send email
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
