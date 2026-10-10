import { Fragment, useState } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import RoomPlannerModal from '../../Components/CompetitionFees/RoomPlannerModal';
import {
    formatDate, formatMoney, METHOD_LABELS, StatusBadge, SummaryCard, RoleBadge,
    extrasLabel, roomLabel, roomsSummary,
} from '../../Components/CompetitionFees/format';

// Trip overview for participants marked as room editors: room planner plus
// read-only fees, payments and notes. Fees and payments are changed by staff.
export default function RoomPlanner({ competition, totals, rooms, roomPlan, participants }) {
    const cur = competition.currency;
    const [showPlanner, setShowPlanner] = useState(false);
    const [openId, setOpenId] = useState(null);

    const active = participants.filter((p) => p.status !== 'cancelled');
    const rs = roomsSummary(rooms, participants);
    const roomTitle = (p) => {
        const room = p.room_id && rooms.find((r) => r.id === p.room_id);
        return room ? (room.name ? `Room ${room.name}` : `Room ${room.number}`) : '';
    };

    return (
        <Layout>
            <div className="py-4 max-w-5xl mx-auto">
                <Link href="/my-payments" className="text-sm text-blue-600 hover:text-blue-800">← My Payments</Link>
                <div className="mt-2 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{competition.name}</h1>
                        <div className="text-gray-500">{[competition.date_range, competition.location].filter(Boolean).join(' · ')}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPlanner(true)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                    >
                        Open room planner
                    </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <SummaryCard label="Expected" value={formatMoney(totals.expected, cur)} className="text-gray-900 text-base sm:text-lg" />
                    <SummaryCard label="Collected" value={formatMoney(totals.collected, cur)} className="text-green-600 text-base sm:text-lg" />
                    <SummaryCard label="Remaining" value={formatMoney(totals.remaining, cur)} className="text-red-600 text-base sm:text-lg" />
                </div>
                <div className="mb-2 text-sm text-gray-700">
                    People going: <strong>{totals.people.athletes + totals.people.supporters + totals.people.children}</strong>
                    {' '}({totals.people.athletes} athletes · {totals.people.supporters} supporters · {totals.people.children} children)
                </div>
                <div className="mb-4 text-sm text-gray-700">
                    {rooms.length > 0 ? (
                        <>
                            Rooms: {rs.bySize.map((s) => `${s.count}× ${s.beds}-bed`).join(', ')} · total <strong>{rs.total}</strong>{' '}
                            <span className="text-gray-500">({rs.used}/{rs.beds} beds used)</span>
                            {rs.unassigned > 0 && <span className="text-red-600"> · {rs.unassigned} not in a room</span>}
                        </>
                    ) : (
                        <>Rooms needed (estimate): <strong>{roomPlan.total_rooms}</strong></>
                    )}
                    {competition.rooms_visible && <span className="ml-2 text-indigo-700">· visible to members</span>}
                </div>

                {/* Participants (read-only) */}
                <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
                    {active.map((p) => (
                        <Fragment key={p.id}>
                            <button
                                type="button"
                                onClick={() => setOpenId(openId === p.id ? null : p.id)}
                                className="w-full text-left p-4 hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900">
                                            {p.member.name}
                                            <RoleBadge role={p.role} />
                                            {roomTitle(p) && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white">{roomTitle(p)}</span>
                                            )}
                                        </div>
                                        {(extrasLabel(p) || roomLabel(p)) && (
                                            <div className="text-xs text-gray-600">{[extrasLabel(p), roomLabel(p)].filter(Boolean).join(' · ')}</div>
                                        )}
                                        {p.notes && <div className="text-xs text-gray-500 whitespace-pre-line">{p.notes}</div>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <StatusBadge status={p.payment_status} />
                                        <div className="mt-1 text-sm text-gray-700 whitespace-nowrap">
                                            {formatMoney(p.paid_amount, cur)} / {formatMoney(p.fee_amount, cur)}
                                        </div>
                                    </div>
                                </div>
                            </button>
                            {openId === p.id && (
                                <div className="px-4 pb-4 text-sm text-gray-600 bg-gray-50">
                                    {p.payments.length === 0 ? (
                                        <div className="pt-2">No payments yet.</div>
                                    ) : (
                                        <ul className="pt-2 space-y-1">
                                            {p.payments.map((pay) => (
                                                <li key={pay.id} className="flex justify-between gap-3">
                                                    <span>
                                                        {formatDate(pay.paid_at)} • {METHOD_LABELS[pay.payment_method] || pay.payment_method}
                                                        {pay.note && <span className="text-gray-500"> · {pay.note}</span>}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{formatMoney(pay.amount, cur)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </Fragment>
                    ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">Tap a participant to see their payments. Fees and payments are managed by the club admins.</p>
            </div>

            {showPlanner && (
                <RoomPlannerModal
                    competition={competition}
                    rooms={rooms}
                    participants={participants}
                    roomPlan={roomPlan}
                    onClose={() => setShowPlanner(false)}
                />
            )}
        </Layout>
    );
}
