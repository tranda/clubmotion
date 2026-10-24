import { useForm } from '@inertiajs/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, StatusBadge, METHOD_LABELS, formatDate, formatMoney, inputClass, effectiveStay, stayLabel, paidLabel } from './format';

// Participant details: amounts, fee/status editing and payment history.
export default function ParticipantModal({ competition, participant, namesEnabled = false, onAddPayment, onEditPayment, onDeletePayment, onRemove, onClose }) {
    const cur = competition.currency;
    const { data, setData, put, transform, processing, errors, isDirty } = useForm({
        role: participant.role || 'athlete',
        fee_amount: participant.fee_amount,
        status: participant.status,
        preferred_room: participant.preferred_room ?? '',
        extra_athletes: participant.extra_athletes ?? 0,
        extra_supporters: participant.extra_supporters ?? 0,
        children_dobs: participant.children_dobs ?? Array.from({ length: participant.extra_children || 0 }, () => null),
        notes: participant.notes || '',
        extra_names: {
            athlete: participant.extra_names?.athlete || [],
            supporter: participant.extra_names?.supporter || [],
            child: participant.extra_names?.child || [],
        },
        can_edit_rooms: !!participant.can_edit_rooms,
        // Shown as effective dates; saved as null when equal to the default.
        check_in: effectiveStay(participant, competition.room_dates).check_in || '',
        check_out: effectiveStay(participant, competition.room_dates).check_out || '',
    });

    const save = (e) => {
        e.preventDefault();
        const defaults = competition.room_dates || {};
        // Dates equal to the default are saved as null so they follow it.
        transform((d) => ({
            ...d,
            ...(namesEnabled ? {} : { extra_names: undefined }),
            check_in: d.check_in && d.check_in !== defaults.check_in ? d.check_in : null,
            check_out: d.check_out && d.check_out !== defaults.check_out ? d.check_out : null,
        }));
        put(`/payments/competition-fees/participants/${participant.id}`, { preserveScroll: true });
    };

    // Name of additional person i of a type ('athlete' | 'supporter' | 'child').
    const nameOf = (type, i) => data.extra_names[type]?.[i] || '';
    const setName = (type, i, value) => {
        const list = [...(data.extra_names[type] || [])];
        while (list.length <= i) list.push('');
        list[i] = value;
        setData('extra_names', { ...data.extra_names, [type]: list });
    };

    // Notes start one line tall and grow with their content.
    const notesRef = useRef(null);
    useLayoutEffect(() => {
        const el = notesRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [data.notes]);

    const email = participant.member.email;
    const [copied, setCopied] = useState(false);
    const copyEmail = () => {
        navigator.clipboard?.writeText(email).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <Modal title={participant.member.name} onClose={onClose} wide>
            {email && (
                <div className="-mt-3 mb-4 flex items-center gap-2 text-sm">
                    <span className="text-gray-600 select-all">{email}</span>
                    <button type="button" onClick={copyEmail} className="text-blue-600 hover:text-blue-800" title="Copy email">
                        {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                </div>
            )}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">Competition fee</div>
                    <div className="font-semibold">{formatMoney(participant.fee_amount, cur)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">Paid</div>
                    <div className="font-semibold text-green-700">{formatMoney(participant.paid_amount, cur)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">{participant.overpaid_amount > 0 ? 'Overpaid' : 'Remaining'}</div>
                    <div className={`font-semibold ${participant.overpaid_amount > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {formatMoney(participant.overpaid_amount > 0 ? participant.overpaid_amount : participant.remaining_amount, cur)}
                    </div>
                </div>
            </div>
            <div className="mb-4"><StatusBadge status={participant.payment_status} /></div>

            {/* Fee / status */}
            <form onSubmit={save} className="border rounded-md p-3 mb-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee for {participant.member.name.split(' ')[0]} ({cur})</label>
                        <input type="number" min="0" step="0.01" required value={data.fee_amount} onChange={(e) => setData('fee_amount', e.target.value)} className={inputClass} />
                        {competition.default_fee !== null && (
                            <p className="mt-1 text-xs text-gray-500">Default: {formatMoney(competition.default_fee, cur)}</p>
                        )}
                        {participant.accommodation_applied > 0 && (
                            <p className="text-xs text-gray-500">Includes accommodation {formatMoney(participant.accommodation_applied, cur)}</p>
                        )}
                        {errors.fee_amount && <p className="mt-1 text-sm text-red-600">{errors.fee_amount}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Participation</label>
                        <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputClass}>
                            <option value="active">Active</option>
                            <option value="exempt">Exempt from fee</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registered as</label>
                        <select value={data.role} onChange={(e) => setData('role', e.target.value)} className={inputClass}>
                            <option value="athlete">Athlete</option>
                            <option value="supporter">Supporter</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred room</label>
                        <select value={data.preferred_room} onChange={(e) => setData('preferred_room', e.target.value === '' ? '' : Number(e.target.value))} className={inputClass}>
                            <option value="">No preference</option>
                            {[1, 2, 3, 4, 5]
                                // Only available types, plus the current choice if it no longer is.
                                .filter((b) => !competition.room_types?.length || competition.room_types.includes(b) || b === participant.preferred_room)
                                .map((b) => (
                                    <option key={b} value={b}>{b}-bed room</option>
                                ))}
                        </select>
                        {errors.preferred_room && <p className="mt-1 text-sm text-red-600">{errors.preferred_room}</p>}
                    </div>
                </div>
                <div>
                    <div className="block text-sm font-medium text-gray-700 mb-1">Additional</div>
                    <div className="grid grid-cols-3 gap-3">
                        {[['extra_athletes', 'Athletes'], ['extra_supporters', 'Supporters']].map(([field, label]) => (
                            <div key={field}>
                                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    max="99"
                                    step="1"
                                    value={data[field]}
                                    onChange={(e) => setData(field, e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    className={inputClass}
                                />
                                {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
                            </div>
                        ))}
                    </div>
                    {namesEnabled && [['extra_athletes', 'athlete', 'Athlete'], ['extra_supporters', 'supporter', 'Supporter']].map(([field, type, label]) => (
                        (parseInt(data[field], 10) || 0) > 0 && (
                            <div key={type} className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Array.from({ length: Math.min(parseInt(data[field], 10) || 0, 99) }, (_, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        maxLength="60"
                                        value={nameOf(type, i)}
                                        onChange={(e) => setName(type, i, e.target.value)}
                                        placeholder={`${label} ${i + 1} name`}
                                        className={inputClass}
                                    />
                                ))}
                            </div>
                        )
                    ))}
                    <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-gray-500">Children (date of birth — sets the room price)</label>
                            <button
                                type="button"
                                onClick={() => setData((d) => ({
                                    ...d,
                                    children_dobs: [...d.children_dobs, null],
                                    extra_names: { ...d.extra_names, child: [...Array.from({ length: d.children_dobs.length }, (_, j) => d.extra_names.child?.[j] || ''), ''] },
                                }))}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                + Add child
                            </button>
                        </div>
                        {data.children_dobs.length === 0 && <p className="text-xs text-gray-400">No children.</p>}
                        <div className="space-y-2">
                            {data.children_dobs.map((dob, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {namesEnabled && (
                                        <input
                                            type="text"
                                            maxLength="60"
                                            value={nameOf('child', i)}
                                            onChange={(e) => setName('child', i, e.target.value)}
                                            placeholder={`Child ${i + 1} name`}
                                            className={inputClass}
                                        />
                                    )}
                                    <input
                                        type="date"
                                        value={dob || ''}
                                        onChange={(e) => setData('children_dobs', data.children_dobs.map((d, j) => (j === i ? e.target.value || null : d)))}
                                        className={inputClass}
                                    />
                                    <span className="text-xs text-gray-500 whitespace-nowrap w-24">
                                        {participant.children_dobs?.[i] === dob && participant.children?.[i]
                                            ? (participant.children[i].age == null
                                                ? 'DOB missing'
                                                : `${participant.children[i].age} y · ${participant.children[i].band || 'adult'}`)
                                            : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setData((d) => ({
                                            ...d,
                                            children_dobs: d.children_dobs.filter((_, j) => j !== i),
                                            extra_names: { ...d.extra_names, child: (d.extra_names.child || []).filter((_, j) => j !== i) },
                                        }))}
                                        className="text-gray-400 hover:text-red-600"
                                        aria-label="Remove child"
                                    >
                                        ✕
                                    </button>
                                    {errors[`children_dobs.${i}`] && <p className="text-xs text-red-600">{errors[`children_dobs.${i}`]}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <div className="block text-sm font-medium text-gray-700 mb-1">Stay</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Check-in</label>
                            <input type="date" value={data.check_in} onChange={(e) => setData('check_in', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Check-out</label>
                            <input type="date" value={data.check_out} onChange={(e) => setData('check_out', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    {stayLabel(competition.room_dates || {}) && (
                        <p className="mt-1 text-xs text-gray-500">Default: {stayLabel(competition.room_dates)} (set in Room planner)</p>
                    )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={data.can_edit_rooms} onChange={(e) => setData('can_edit_rooms', e.target.checked)} />
                    Can edit room planner
                    <span className="text-xs text-gray-500">(from My Payments; can view fees, payments and notes)</span>
                </label>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea ref={notesRef} rows={1} value={data.notes} onChange={(e) => setData('notes', e.target.value)} className={`${inputClass} resize-none overflow-hidden`} />
                </div>
                <div className="flex justify-between items-center">
                    <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:text-red-800">
                        Remove from competition
                    </button>
                    <button type="submit" disabled={processing || !isDirty} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300">
                        Save changes
                    </button>
                </div>
            </form>

            {/* Payment history */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">Payment History</h3>
                <button onClick={onAddPayment} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    + Payment
                </button>
            </div>
            {participant.payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase border-b">
                                <th className="py-2 pr-3">Date</th>
                                <th className="py-2 pr-3 text-right">Amount</th>
                                <th className="py-2 pr-3">Method</th>
                                <th className="py-2 pr-3">Note</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {participant.payments.map((p) => (
                                <tr key={p.id}>
                                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(p.paid_at)}</td>
                                    <td className="py-2 pr-3 text-right whitespace-nowrap">{paidLabel(p, cur)}</td>
                                    <td className="py-2 pr-3 whitespace-nowrap">
                                        {METHOD_LABELS[p.payment_method] || '—'}
                                        {p.post_to_ledger === false && <span className="block text-xs text-gray-500">not in Ledger</span>}
                                    </td>
                                    <td className="py-2 pr-3 text-gray-600">
                                        {p.note}
                                        {(p.paid_by || p.party_slot) && (
                                            <span className="block text-xs text-gray-500">
                                                {[p.paid_by && `paid by ${p.paid_by}`, p.party_slot && (participant.units || []).find((u) => u.slot === p.party_slot)?.label && `for ${(participant.units || []).find((u) => u.slot === p.party_slot).label}`].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 whitespace-nowrap text-right">
                                        <button onClick={() => onEditPayment(p)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                        <button onClick={() => onDeletePayment(p)} className="text-red-600 hover:text-red-800">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 text-right">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
            </div>
        </Modal>
    );
}
