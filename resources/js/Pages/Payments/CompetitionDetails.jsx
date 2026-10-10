import { Fragment, useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';
import CompetitionFormModal from '../../Components/CompetitionFees/CompetitionFormModal';
import AddParticipantsModal from '../../Components/CompetitionFees/AddParticipantsModal';
import PaymentModal from '../../Components/CompetitionFees/PaymentModal';
import ParticipantModal from '../../Components/CompetitionFees/ParticipantModal';
import RoomPlannerModal from '../../Components/CompetitionFees/RoomPlannerModal';
import { formatDate, formatMoney, CompetitionStatusBadge, StatusBadge, SummaryCard, RoleBadge, extrasLabel, roomLabel, bedsFor } from '../../Components/CompetitionFees/format';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'partial', label: 'Partial' },
    { key: 'unpaid', label: 'Unpaid' },
    { key: 'exempt', label: 'Exempt' },
    { key: 'cancelled', label: 'Cancelled' },
];

export default function CompetitionDetails({ competition, totals, roomPlan, rooms = [], participants, availableMembers, currencies, paymentMethods }) {
    const cur = competition.currency;
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [showEdit, setShowEdit] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [showRooms, setShowRooms] = useState(false);
    const [groupByRoom, setGroupByRoomState] = useState(() => {
        try { return localStorage.getItem('competitionGroupByRoom') === '1'; } catch { return false; }
    });
    const setGroupByRoom = (on) => {
        setGroupByRoomState(on);
        try { localStorage.setItem('competitionGroupByRoom', on ? '1' : '0'); } catch { /* ignore */ }
    };
    const [detailsId, setDetailsId] = useState(null);
    // { participantId, payment|null } for the add/edit payment modal
    const [paymentTarget, setPaymentTarget] = useState(null);
    const [confirm, setConfirm] = useState(null); // { title, message, label, action }

    // Always read participants from the latest props so modals refresh after saves.
    const byId = (id) => participants.find((p) => p.id === id);
    const detailsParticipant = detailsId ? byId(detailsId) : null;
    const roomNumber = (p) => {
        const room = p.room_id && rooms.find((r) => r.id === p.room_id);
        return room ? (room.name ? `Room ${room.name}` : `Room ${room.number}`) : '';
    };
    const paymentParticipant = paymentTarget ? byId(paymentTarget.participantId) : null;

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return participants.filter((p) => {
            if (q && !p.member.name.toLowerCase().includes(q)) return false;
            if (filter === 'all') return p.status !== 'cancelled';
            if (filter === 'paid') return p.payment_status === 'paid' || p.payment_status === 'overpaid';
            return p.payment_status === filter;
        });
    }, [participants, filter, search]);

    // Visible participants, optionally grouped by room (rooms in order, then "Not in a room").
    const groups = useMemo(() => {
        if (!groupByRoom || rooms.length === 0) return [{ key: 'all', items: visible }];
        const result = rooms.map((room) => {
            const items = visible.filter((p) => p.room_id === room.id);
            const used = participants
                .filter((p) => p.room_id === room.id && p.status !== 'cancelled')
                .reduce((n, p) => n + bedsFor(p), 0);
            return { key: `room-${room.id}`, room, used, items };
        });
        result.push({ key: 'none', items: visible.filter((p) => !p.room_id || !rooms.some((r) => r.id === p.room_id)) });
        return result.filter((g) => g.items.length > 0);
    }, [groupByRoom, rooms, visible, participants]);
    const grouped = groups.length > 1 || groups[0]?.key !== 'all';

    const groupHeader = (g) =>
        g.room ? (
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white">
                    {g.room.name ? `Room ${g.room.name}` : `Room ${g.room.number}`}
                </span>
                <span className={`text-xs ${g.used > g.room.beds ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {g.room.beds}-bed · {g.used}/{g.room.beds} beds
                </span>
            </div>
        ) : (
            <span className="text-xs font-semibold text-gray-600 uppercase">Not in a room</span>
        );

    const countFor = (key) => {
        if (key === 'all') return totals.participants;
        if (key === 'paid') return totals.paid;
        return totals[key];
    };

    const removeParticipant = (p) =>
        setConfirm({
            title: `Remove ${p.member.name}?`,
            message: p.payments.length > 0
                ? 'This participant has payments, so they will be marked Cancelled and their payment history kept.'
                : 'The participant will be removed from this competition.',
            label: p.payments.length > 0 ? 'Mark Cancelled' : 'Remove',
            action: () => router.delete(`/payments/competition-fees/participants/${p.id}`, {
                preserveScroll: true,
                onSuccess: () => setDetailsId(null),
            }),
        });

    const deletePayment = (payment) =>
        setConfirm({
            title: 'Delete payment?',
            message: `${formatDate(payment.paid_at)} · ${formatMoney(payment.amount, cur)}. The matching Ledger entry is deleted too. This cannot be undone.`,
            label: 'Delete',
            action: () => router.delete(`/payments/competition-fees/payments/${payment.id}`, { preserveScroll: true }),
        });

    const deleteCompetition = () =>
        setConfirm({
            title: `Delete ${competition.name}?`,
            message: 'Only possible when no payments were recorded. Participants are removed as well.',
            label: 'Delete',
            action: () => router.delete(`/payments/competition-fees/${competition.id}`),
        });

    const download = (format) => {
        window.location.href = `/payments/competition-fees/${competition.id}/export?format=${format}`;
    };

    return (
        <Layout>
            <div className="py-4">
                <Link href="/payments/competition-fees" className="text-sm text-blue-600 hover:text-blue-800">← Competition Fees</Link>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mt-2 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{competition.name}</h1>
                            <CompetitionStatusBadge status={competition.status} />
                        </div>
                        <div className="text-gray-500">
                            {[competition.date_range, competition.location].filter(Boolean).join(' · ') || 'No date set'}
                        </div>
                        <div className="text-sm text-gray-500">
                            Default fee: {competition.default_fee !== null ? formatMoney(competition.default_fee, cur) : 'not set'}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => download('xlsx')} className="px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">📥 XLSX</button>
                        <button onClick={() => download('csv')} className="px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700">📥 CSV</button>
                        <button onClick={() => setShowEdit(true)} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">Edit</button>
                        {competition.status !== 'closed' && (
                            <button
                                onClick={() => router.put(`/payments/competition-fees/${competition.id}`, { ...competition, status: 'closed' }, { preserveScroll: true })}
                                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                            >
                                Close competition
                            </button>
                        )}
                        <button onClick={deleteCompetition} className="px-3 py-2 bg-white border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50">Delete</button>
                    </div>
                </div>

                {competition.status === 'closed' && (
                    <div className="mb-4 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700">
                        This competition is closed. Late payments can still be recorded.
                    </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
                    <SummaryCard label="Expected" value={formatMoney(totals.expected, cur)} className="text-gray-900 text-base sm:text-lg" />
                    <SummaryCard label="Collected" value={formatMoney(totals.collected, cur)} className="text-green-600 text-base sm:text-lg" />
                    <SummaryCard label="Remaining" value={formatMoney(totals.remaining, cur)} className="text-red-600 text-base sm:text-lg" />
                    <SummaryCard label="Paid" value={totals.paid} className="text-green-600" />
                    <SummaryCard label="Partial" value={totals.partial} className="text-yellow-600" />
                    <SummaryCard label="Unpaid" value={totals.unpaid} className="text-red-600" />
                </div>
                {totals.people && (
                    <div className="mb-4 text-sm text-gray-700">
                        People going: <strong>{totals.people.athletes + totals.people.supporters + totals.people.children}</strong>
                        {' '}({totals.people.athletes} athletes · {totals.people.supporters} supporters · {totals.people.children} children)
                    </div>
                )}
                {roomPlan && (
                    <div className="mb-4 text-sm text-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Rooms needed:</span>
                        {roomPlan.sizes.filter((r) => r.available || r.needed > 0).map((r) => (
                            <span
                                key={r.beds}
                                className={!r.available ? 'text-red-600 font-medium' : ''}
                                title={!r.available ? 'This room type is not available' : ''}
                            >
                                {r.beds}-bed <strong>{r.needed}</strong>{!r.available && ' (not available)'}
                            </span>
                        ))}
                        {roomPlan.sizes.every((r) => !r.available && r.needed === 0) && <span className="text-gray-400">no room types set</span>}
                        {roomPlan.total_rooms > 0 && <span>· total <strong>{roomPlan.total_rooms}</strong></span>}
                        {roomPlan.no_preference > 0 && (
                            <span className={roomPlan.unplaced > 0 ? 'text-red-600' : 'text-gray-500'}>
                                ({roomPlan.no_preference} without preference{roomPlan.unplaced > 0 ? ' not placed: no room types set' : ' included'})
                            </span>
                        )}
                        <button type="button" onClick={() => setShowRooms(true)} className="text-blue-600 hover:text-blue-800">Room planner</button>
                    </div>
                )}
                {totals.overpaid > 0 && (
                    <div className="mb-4 text-sm text-blue-700">
                        Overpaid in total: {formatMoney(totals.overpaid, cur)} ({totals.overpaid_count} participant{totals.overpaid_count === 1 ? '' : 's'})
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-1.5 rounded-full text-sm ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                {f.label} <span className="opacity-70">{countFor(f.key)}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 items-center">
                        {rooms.length > 0 && (
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 whitespace-nowrap cursor-pointer">
                                <input type="checkbox" checked={groupByRoom} onChange={(e) => setGroupByRoom(e.target.checked)} />
                                Group by room
                            </label>
                        )}
                        <input
                            type="text"
                            placeholder="Search member…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 whitespace-nowrap">
                            + Add Participants
                        </button>
                    </div>
                </div>

                {/* Participants */}
                {visible.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        {participants.length === 0 ? 'No participants yet. Use "+ Add Participants".' : 'No participants match this filter.'}
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Member', 'Fee', 'Paid', 'Remaining', 'Status', 'Last Payment', ''].map((h, i) => (
                                            <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${i >= 1 && i <= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {groups.map((g) => (
                                        <Fragment key={g.key}>
                                        {grouped && (
                                            <tr className="bg-indigo-50">
                                                <td colSpan={7} className="px-4 py-2">{groupHeader(g)}</td>
                                            </tr>
                                        )}
                                    {g.items.map((p) => (
                                        <tr key={p.id} className={`hover:bg-gray-50 ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer" onClick={() => setDetailsId(p.id)}>
                                                {p.member.name}
                                                <RoleBadge role={p.role} />
                                                {!grouped && roomNumber(p) && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white">{roomNumber(p)}</span>}
{(extrasLabel(p) || roomLabel(p)) && <div className="text-xs text-gray-600 font-normal">{[extrasLabel(p), roomLabel(p)].filter(Boolean).join(' · ')}</div>}
                                                {p.notes && <div className="text-xs text-gray-500 font-normal whitespace-pre-line">{p.notes}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">{formatMoney(p.fee_amount, cur)}</td>
                                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap text-green-700">{formatMoney(p.paid_amount, cur)}</td>
                                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                                {p.overpaid_amount > 0
                                                    ? <span className="text-blue-700">+{formatMoney(p.overpaid_amount, cur)}</span>
                                                    : <span className="text-red-700">{formatMoney(p.remaining_amount, cur)}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm"><StatusBadge status={p.payment_status} /></td>
                                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.last_payment_at)}</td>
                                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                                                <button
                                                    onClick={() => setPaymentTarget({ participantId: p.id, payment: null })}
                                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-2"
                                                >
                                                    + Payment
                                                </button>
                                                <button onClick={() => setDetailsId(p.id)} className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden bg-white rounded-lg shadow divide-y divide-gray-200">
                            {groups.map((g) => (
                                <Fragment key={g.key}>
                                {grouped && <div className="px-4 py-2 bg-indigo-50">{groupHeader(g)}</div>}
                            {g.items.map((p) => (
                                <div key={p.id} className={`p-4 ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                    <div className="flex items-start justify-between gap-2" onClick={() => setDetailsId(p.id)}>
                                        <div className="font-medium text-gray-900">
                                            {p.member.name}<RoleBadge role={p.role} />
                                            {!grouped && roomNumber(p) && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white">{roomNumber(p)}</span>}
{(extrasLabel(p) || roomLabel(p)) && <div className="text-xs text-gray-600 font-normal">{[extrasLabel(p), roomLabel(p)].filter(Boolean).join(' · ')}</div>}
                                        </div>
                                        <StatusBadge status={p.payment_status} />
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600" onClick={() => setDetailsId(p.id)}>
                                        {formatMoney(p.paid_amount, cur)} / {formatMoney(p.fee_amount, cur)}
                                        {p.overpaid_amount > 0
                                            ? <span className="text-blue-700"> · +{formatMoney(p.overpaid_amount, cur)} overpaid</span>
                                            : p.remaining_amount > 0 && <span className="text-red-700"> · {formatMoney(p.remaining_amount, cur)} left</span>}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            onClick={() => setPaymentTarget({ participantId: p.id, payment: null })}
                                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded"
                                        >
                                            + Payment
                                        </button>
                                        <button onClick={() => setDetailsId(p.id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded">View</button>
                                    </div>
                                </div>
                            ))}
                                </Fragment>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showEdit && <CompetitionFormModal competition={competition} currencies={currencies} onClose={() => setShowEdit(false)} />}
            {showRooms && (
                <RoomPlannerModal competition={competition} rooms={rooms} participants={participants} roomPlan={roomPlan} onClose={() => setShowRooms(false)} />
            )}
            {showAdd && <AddParticipantsModal competition={competition} members={availableMembers} onClose={() => setShowAdd(false)} />}
            {detailsParticipant && (
                <ParticipantModal
                    key={`${detailsParticipant.id}-${detailsParticipant.role}-${extrasLabel(detailsParticipant)}-${detailsParticipant.preferred_room}-${detailsParticipant.fee_amount}-${detailsParticipant.status}-${detailsParticipant.notes}`}
                    competition={competition}
                    participant={detailsParticipant}
                    onAddPayment={() => setPaymentTarget({ participantId: detailsParticipant.id, payment: null })}
                    onEditPayment={(payment) => setPaymentTarget({ participantId: detailsParticipant.id, payment })}
                    onDeletePayment={deletePayment}
                    onRemove={() => removeParticipant(detailsParticipant)}
                    onClose={() => setDetailsId(null)}
                />
            )}
            {paymentParticipant && (
                <PaymentModal
                    competition={competition}
                    participant={paymentParticipant}
                    payment={paymentTarget.payment}
                    paymentMethods={paymentMethods}
                    onClose={() => setPaymentTarget(null)}
                />
            )}
            <ConfirmModal
                open={!!confirm}
                title={confirm?.title}
                message={confirm?.message}
                confirmLabel={confirm?.label}
                danger
                onConfirm={() => { confirm.action(); setConfirm(null); }}
                onCancel={() => setConfirm(null)}
            />
        </Layout>
    );
}
