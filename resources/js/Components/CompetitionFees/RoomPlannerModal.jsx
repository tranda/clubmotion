import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Modal, RoleBadge, extrasLabel, inputClass, allUnits, roomsSummary, bedColor, stayRange, stayLabel, effectiveStay, hasOwnStay, formatMoney } from './format';
import AccommodationPrices from './AccommodationPrices';

const dateInput = 'border border-gray-300 rounded px-2 py-1 bg-white';

const SIZES = [1, 2, 3, 4, 5];
const base = '/payments/competition-fees';
const opts = { preserveScroll: true, preserveState: true };


// Room planner: room types available, numbered rooms and who sleeps where.
export default function RoomPlannerModal({ competition, rooms, participants, roomPlan, onClose, canToggleVisibility = true }) {
    const [newBeds, setNewBeds] = useState(competition.room_types?.[0] || 2);
    const { roomSnapshots = [], accommodation } = usePage().props;
    const cur = competition.currency;
    // Cost of a planner unit (participant with the people still with them, or a separated person).
    const unitCost = (u) => accommodation?.units?.[u.key];
    const [snapshotName, setSnapshotName] = useState('');
    const saveSnapshot = () =>
        router.post(`${base}/${competition.id}/room-snapshots`, { name: snapshotName }, { ...opts, onSuccess: () => setSnapshotName('') });
    const restoreSnapshot = (s) => {
        if (!confirm(`Restore "${s.name}"? The current room plan will be replaced. Save it as a snapshot first if you want to keep it.`)) return;
        router.post(`${base}/room-snapshots/${s.id}/restore`, {}, opts);
    };
    const deleteSnapshot = (s) => {
        if (!confirm(`Delete snapshot "${s.name}"?`)) return;
        router.delete(`${base}/room-snapshots/${s.id}`, opts);
    };
    const types = competition.room_types || [];

    const units = allUnits(participants);
    const unassigned = units.filter((u) => !u.room_id || !rooms.some((r) => r.id === u.room_id));

    const toggleType = (beds) => {
        const next = types.includes(beds) ? types.filter((b) => b !== beds) : [...types, beds].sort();
        router.put(`${base}/${competition.id}/rooms`, { room_types: next }, opts);
    };
    const setVisible = (visible) => router.put(`${base}/${competition.id}/rooms-visibility`, { visible }, opts);
    const defaults = competition.room_dates || {};
    const setDefaultDates = (field, value) =>
        router.put(`${base}/${competition.id}/room-dates`, {
            rooms_check_in: defaults.check_in,
            rooms_check_out: defaults.check_out,
            [field]: value || null,
        }, opts);
    // Room dates apply to everyone in the room.
    const setRoomStay = (room, range, field, value) =>
        router.put(`${base}/planner-rooms/${room.id}/stay`, {
            check_in: range.check_in,
            check_out: range.check_out,
            [field]: value || null,
        }, opts);
    const setPersonStay = (p, field, value) => {
        const stay = effectiveStay(p, defaults);
        router.put(`${base}/participants/${p.id}/stay`, { ...stay, nights: undefined, [field]: value || null }, opts);
    };
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
    // Separated additional people: place (room or null), or put back with their participant.
    const splitExtra = (p, slot, separate, roomId = null) =>
        router.put(`${base}/participants/${p.id}/split`, { slot, separate, room_id: roomId }, opts);
    const placeUnit = (u, roomId) => (u.slot === 'main' ? assign(u.participant.id, roomId) : splitExtra(u.participant, u.slot, true, roomId));
    const removeUnit = (u) => (u.slot === 'main' ? assign(u.participant.id, null) : splitExtra(u.participant, u.slot, false));

    // Additional people still with the participant, which can be separated.
    const separable = (p) => {
        const split = p.split_extras || {};
        const first = (p.member.name || '').split(' ')[0];
        const slots = [];
        for (let i = 1; i <= (p.extra_athletes || 0); i++) slots.push([`athlete:${i}`, `${first}'s athlete #${i}`]);
        for (let i = 1; i <= (p.extra_supporters || 0); i++) slots.push([`supporter:${i}`, `${first}'s supporter #${i}`]);
        for (let i = 1; i <= (p.extra_children || 0); i++) {
            const age = p.children?.[i - 1]?.age;
            slots.push([`child:${i}`, `${first}'s child #${i}${age != null ? ` (${age})` : ''}`]);
        }
        return slots.filter(([slot]) => !(slot in split));
    };

    const unitName = (u) => {
        const p = u.participant;
        if (u.slot !== 'main') {
            return <span className="italic">{u.label}</span>;
        }
        return (
            <>
                {p.member.name}
                <RoleBadge role={p.role} />
                {u.extras && <span className="text-xs text-gray-500"> {u.extras}</span>}
                {p.preferred_room && <span className="text-xs text-gray-400"> · wants {p.preferred_room}-bed</span>}
                {hasOwnStay(p) && <span className="text-xs text-amber-700"> · {stayLabel(effectiveStay(p, defaults))}</span>}
            </>
        );
    };
    const unitOption = (u) => {
        const p = u.participant;
        if (u.slot !== 'main') return u.label;
        return `${p.member.name}${u.beds > 1 ? ` (+${u.beds - 1})` : ''}${p.preferred_room ? ` · wants ${p.preferred_room}-bed` : ''}${hasOwnStay(p) ? ` · ${stayLabel(effectiveStay(p, defaults))}` : ''}`;
    };

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
            {canToggleVisibility && (
            <label className="mb-4 flex items-center gap-2 text-sm cursor-pointer rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
                <input type="checkbox" checked={!!competition.rooms_visible} onChange={(e) => setVisible(e.target.checked)} />
                <span>
                    <span className="font-medium text-gray-900">Show room plan to members</span>
                    <span className="text-gray-500"> · participants see all rooms and who is in them (read-only) on My Payments</span>
                </span>
            </label>
            )}

            <AccommodationPrices key={JSON.stringify(accommodation?.settings)} competition={competition} accommodation={accommodation} />

            {/* Snapshots */}
            <details className="mb-4 rounded-md border border-gray-200 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Snapshots {roomSnapshots.length > 0 && <span className="text-gray-500">({roomSnapshots.length})</span>}
                </summary>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={snapshotName}
                        onChange={(e) => setSnapshotName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveSnapshot(); } }}
                        placeholder="Name, e.g. Variant A"
                        maxLength={100}
                        className={`${inputClass} w-auto flex-1 min-w-[12rem]`}
                    />
                    <button type="button" onClick={saveSnapshot} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                        Save current plan
                    </button>
                </div>
                {roomSnapshots.length === 0 ? (
                    <p className="mt-2 text-xs text-gray-500">No snapshots yet. Save the current plan to try other variations and come back to it.</p>
                ) : (
                    <ul className="mt-2 divide-y divide-gray-100">
                        {roomSnapshots.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                                <span>
                                    <span className="font-medium text-gray-900">{s.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {' '}· {s.rooms} rooms · {s.placed} people placed · {s.created_at}{s.created_by ? ` · ${s.created_by}` : ''}
                                    </span>
                                </span>
                                <span className="flex items-center gap-3">
                                    <button type="button" onClick={() => restoreSnapshot(s)} className="text-indigo-600 hover:text-indigo-800">Restore</button>
                                    <button type="button" onClick={() => deleteSnapshot(s)} className="text-gray-400 hover:text-red-600" aria-label={`Delete ${s.name}`}>✕</button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </details>

            {/* Default stay for everyone */}
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Default check-in</label>
                    <input type="date" value={defaults.check_in || ''} onChange={(e) => setDefaultDates('rooms_check_in', e.target.value)} className={`${dateInput} text-sm`} />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Default check-out</label>
                    <input type="date" value={defaults.check_out || ''} onChange={(e) => setDefaultDates('rooms_check_out', e.target.value)} className={`${dateInput} text-sm`} />
                </div>
                <p className="text-xs text-gray-500 pb-1">Everyone stays these dates unless their room or they have other dates.</p>
            </div>

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
                {rooms.length > 0 && (
                    <a
                        href={`${base}/${competition.id}/room-plan.pdf`}
                        className="ml-auto px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                    >
                        📄 PDF
                    </a>
                )}
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
                        {unassigned.map((u) => {
                            const p = u.participant;
                            const stay = effectiveStay(p, defaults);
                            return (
                                <li key={u.key} className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{unitName(u)}</span>
                                    {u.slot === 'main' ? (
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <input type="date" aria-label="Check-in" value={stay.check_in || ''} onChange={(e) => setPersonStay(p, 'check_in', e.target.value)} className={`${dateInput} text-xs`} />
                                            –
                                            <input type="date" aria-label="Check-out" value={stay.check_out || ''} onChange={(e) => setPersonStay(p, 'check_out', e.target.value)} className={`${dateInput} text-xs`} />
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => removeUnit(u)} className="text-xs text-indigo-600 hover:text-indigo-800">
                                            back with {p.member.name.split(' ')[0]}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Rooms */}
            {rooms.length === 0 ? (
                <div className="text-sm text-gray-500 py-6 text-center">No rooms yet. Add a room or create rooms from the plan.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rooms.map((room) => {
                        const occupants = units.filter((u) => u.room_id === room.id);
                        const used = occupants.reduce((n, u) => n + u.beds, 0);
                        const over = used > room.beds;
                        const free = Math.max(0, room.beds - used);
                        const range = stayRange([...new Set(occupants.map((u) => u.participant))], defaults);
                        return (
                            <div key={room.id} className={`border rounded-lg p-3 ${bedColor(room.beds)} ${over ? '!border-red-400 border-2' : free > 0 ? '!border-orange-400 border-2 border-dashed' : ''}`}>
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
                                <div className={`text-xs mb-2 ${over ? 'text-red-600 font-medium' : free > 0 ? 'text-orange-600 font-medium' : 'text-green-700'}`}>
                                    {used}/{room.beds} beds{over && ' — over capacity'}{free > 0 && ` — ${free} bed${free === 1 ? '' : 's'} free`}
                                    {accommodation?.rooms?.[room.id]?.total > 0 && (
                                        <span className="ml-2 text-gray-700 font-medium">· {formatMoney(accommodation.rooms[room.id].total, cur)}</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mb-2 text-xs text-gray-500">
                                    <input
                                        type="date"
                                        aria-label="Room check-in"
                                        value={range.check_in || ''}
                                        disabled={occupants.length === 0}
                                        onChange={(e) => setRoomStay(room, range, 'check_in', e.target.value)}
                                        className={`${dateInput} text-xs disabled:bg-gray-50`}
                                    />
                                    –
                                    <input
                                        type="date"
                                        aria-label="Room check-out"
                                        value={range.check_out || ''}
                                        disabled={occupants.length === 0}
                                        onChange={(e) => setRoomStay(room, range, 'check_out', e.target.value)}
                                        className={`${dateInput} text-xs disabled:bg-gray-50`}
                                    />
                                    {range.nights != null && <span>{range.nights} night{range.nights === 1 ? '' : 's'}</span>}
                                    {range.mixed && <span className="text-red-600 font-medium">dates differ</span>}
                                </div>
                                <ul className="space-y-1 mb-2">
                                    {occupants.map((u) => (
                                        <li key={u.key} className="flex items-start justify-between gap-2 text-sm">
                                            <span>{unitName(u)}</span>
                                            <span className="flex items-start gap-2 shrink-0">
                                            {unitCost(u) != null && <span className="text-xs text-gray-700 tabular-nums whitespace-nowrap">{formatMoney(unitCost(u), cur)}</span>}
                                            {u.slot === 'main' && separable(u.participant).length > 0 && (
                                                <select
                                                    value=""
                                                    onChange={(e) => e.target.value && splitExtra(u.participant, e.target.value, true, null)}
                                                    title="Separate someone to place them in another room"
                                                    className="text-xs border border-gray-300 rounded bg-white text-gray-600 w-6 px-0"
                                                    aria-label="Separate"
                                                >
                                                    <option value="">⇆</option>
                                                    {separable(u.participant).map(([slot, label]) => (
                                                        <option key={slot} value={slot}>Separate {label}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeUnit(u)}
                                                title={u.slot === 'main' ? 'Remove from room' : `Back with ${u.participant.member.name}`}
                                                aria-label={u.slot === 'main' ? `Remove ${u.participant.member.name} from room` : `Back with ${u.participant.member.name}`}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                ✕
                                            </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {unassigned.length > 0 && (
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            const u = unassigned.find((x) => x.key === e.target.value);
                                            if (u) placeUnit(u, room.id);
                                        }}
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-600"
                                    >
                                        <option value="">+ Add participant…</option>
                                        {unassigned.map((u) => (
                                            <option key={u.key} value={u.key}>{unitOption(u)}</option>
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
