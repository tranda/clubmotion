import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Modal, RoleBadge, extrasLabel, inputClass, bedsFor as partySize, roomsSummary } from './format';

const SIZES = [1, 2, 3, 4, 5];
const base = '/payments/competition-fees';
const opts = { preserveScroll: true, preserveState: true };


// Room planner: room types available, numbered rooms and who sleeps where.
export default function RoomPlannerModal({ competition, rooms, participants, roomPlan, onClose }) {
    const [newBeds, setNewBeds] = useState(competition.room_types?.[0] || 2);
    const types = competition.room_types || [];

    const people = participants.filter((p) => p.status !== 'cancelled');
    const unassigned = people.filter((p) => !p.room_id || !rooms.some((r) => r.id === p.room_id));

    const toggleType = (beds) => {
        const next = types.includes(beds) ? types.filter((b) => b !== beds) : [...types, beds].sort();
        router.put(`${base}/${competition.id}/rooms`, { room_types: next }, opts);
    };
    const setVisible = (visible) => router.put(`${base}/${competition.id}/rooms-visibility`, { visible }, opts);
    const addRoom = () => router.post(`${base}/${competition.id}/planner-rooms`, { beds: newBeds }, opts);
    const generate = () => router.post(`${base}/${competition.id}/planner-rooms/generate`, {}, opts);
    const changeBeds = (room, beds) => router.put(`${base}/planner-rooms/${room.id}`, { beds }, opts);
    const rename = (room, name) => {
        const clean = name.trim();
        if (clean === (room.name || '')) return;
        router.put(`${base}/planner-rooms/${room.id}`, { name: clean || null }, opts);
    };
    const removeRoom = (room, count) => {
        if (count > 0 && !confirm(`Remove ${room.name || `room ${room.number}`}? Its ${count} occupant(s) become unassigned.`)) return;
        router.delete(`${base}/planner-rooms/${room.id}`, opts);
    };
    const assign = (participantId, roomId) =>
        router.put(`${base}/participants/${participantId}/room`, { room_id: roomId || null }, opts);

    const nameWithExtras = (p) => (
        <>
            {p.member.name}
            <RoleBadge role={p.role} />
            {extrasLabel(p) && <span className="text-xs text-gray-500"> {extrasLabel(p)}</span>}
            {p.preferred_room && <span className="text-xs text-gray-400"> · wants {p.preferred_room}-bed</span>}
        </>
    );

    return (
        <Modal title="Room planner" onClose={onClose} extraWide>
            {/* Room types available */}
            <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Room types available</div>
                <div className="flex flex-wrap gap-4">
                    {SIZES.map((beds) => (
                        <label key={beds} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={types.includes(beds)} onChange={() => toggleType(beds)} />
                            {beds}-bed
                        </label>
                    ))}
                </div>
                {rooms.length > 0 ? (() => {
                    const rs = roomsSummary(rooms, participants);
                    return (
                        <p className="mt-2 text-xs text-gray-500">
                            Rooms: {rs.bySize.map((s) => `${s.count}× ${s.beds}-bed`).join(', ')} · {rs.used}/{rs.beds} beds used
                        </p>
                    );
                })() : roomPlan && roomPlan.total_rooms > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                        Estimate from preferences: {roomPlan.sizes.filter((r) => r.needed > 0).map((r) => `${r.needed}× ${r.beds}-bed`).join(', ')}
                    </p>
                )}
            </div>

            {/* Member visibility */}
            <label className="mb-4 flex items-center gap-2 text-sm cursor-pointer rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
                <input type="checkbox" checked={!!competition.rooms_visible} onChange={(e) => setVisible(e.target.checked)} />
                <span>
                    <span className="font-medium text-gray-900">Show room plan to members</span>
                    <span className="text-gray-500"> · participants see all rooms and who is in them (read-only) on My Payments</span>
                </span>
            </label>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <select value={newBeds} onChange={(e) => setNewBeds(Number(e.target.value))} className={`${inputClass} w-auto`}>
                    {SIZES.map((b) => (
                        <option key={b} value={b}>{b}-bed</option>
                    ))}
                </select>
                <button type="button" onClick={addRoom} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                    + Add room
                </button>
                <button type="button" onClick={generate} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
                    Create rooms from plan
                </button>
            </div>

            {/* Unassigned */}
            <div className="mb-4 rounded-md bg-gray-50 p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">
                    Not in a room ({unassigned.length})
                </div>
                {unassigned.length === 0 ? (
                    <div className="text-sm text-gray-500">Everyone has a room.</div>
                ) : (
                    <ul className="text-sm text-gray-800 space-y-0.5">
                        {unassigned.map((p) => <li key={p.id}>{nameWithExtras(p)}</li>)}
                    </ul>
                )}
            </div>

            {/* Rooms */}
            {rooms.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center">No rooms yet. Add a room or create rooms from the plan.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rooms.map((room) => {
                        const occupants = people.filter((p) => p.room_id === room.id);
                        const used = occupants.reduce((n, p) => n + partySize(p), 0);
                        const over = used > room.beds;
                        return (
                            <div key={room.id} className={`border rounded-lg p-3 ${over ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <input
                                        key={room.name || ''}
                                        defaultValue={room.name || ''}
                                        placeholder={`Room ${room.number}`}
                                        onBlur={(e) => rename(room, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                        aria-label="Room title"
                                        className="min-w-0 w-28 px-2 py-0.5 rounded-md bg-indigo-600 text-white placeholder-white/90 text-sm font-semibold hover:bg-indigo-700 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={room.beds}
                                            onChange={(e) => changeBeds(room, Number(e.target.value))}
                                            className="text-sm border border-gray-300 rounded px-1 py-0.5 bg-white"
                                        >
                                            {SIZES.map((b) => (
                                                <option key={b} value={b}>{b}-bed</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeRoom(room, occupants.length)}
                                            aria-label={`Remove ${room.name || `room ${room.number}`}`}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div className={`text-xs mb-2 ${over ? 'text-red-600 font-medium' : used === room.beds ? 'text-green-700' : 'text-gray-500'}`}>
                                    {used}/{room.beds} beds{over && ' — over capacity'}
                                </div>
                                <ul className="space-y-1 mb-2">
                                    {occupants.map((p) => (
                                        <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
                                            <span>{nameWithExtras(p)}</span>
                                            <button
                                                type="button"
                                                onClick={() => assign(p.id, null)}
                                                aria-label={`Remove ${p.member.name} from room`}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {unassigned.length > 0 && (
                                    <select
                                        value=""
                                        onChange={(e) => e.target.value && assign(Number(e.target.value), room.id)}
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-600"
                                    >
                                        <option value="">+ Add participant…</option>
                                        {unassigned.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.member.name}{partySize(p) > 1 ? ` (+${partySize(p) - 1})` : ''}{p.preferred_room ? ` · wants ${p.preferred_room}-bed` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                    Close
                </button>
            </div>
        </Modal>
    );
}
