import { useForm } from '@inertiajs/react';
import { useLayoutEffect, useRef } from 'react';
import { Modal, StatusBadge, METHOD_LABELS, formatDate, formatMoney, inputClass, effectiveStay, stayLabel } from './format';

// Participant details: amounts, fee/status editing and payment history.
export default function ParticipantModal({ competition, participant, onAddPayment, onEditPayment, onDeletePayment, onRemove, onClose }) {
    const cur = competition.currency;
    const { data, setData, put, transform, processing, errors, isDirty } = useForm({
        role: participant.role || 'athlete',
        fee_amount: participant.fee_amount,
        status: participant.status,
        preferred_room: participant.preferred_room ?? '',
        extra_athletes: participant.extra_athletes ?? 0,
        extra_supporters: participant.extra_supporters ?? 0,
        extra_children: participant.extra_children ?? 0,
        notes: participant.notes || '',
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
            check_in: d.check_in && d.check_in !== defaults.check_in ? d.check_in : null,
            check_out: d.check_out && d.check_out !== defaults.check_out ? d.check_out : null,
        }));
        put(`/payments/competition-fees/participants/${participant.id}`, { preserveScroll: true });
    };

    // Notes start one line tall and grow with their content.
    const notesRef = useRef(null);
    useLayoutEffect(() => {
        const el = notesRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [data.notes]);

    return (
        <Modal title={participant.member.name} onClose={onClose} wide>
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
                        {[['extra_athletes', 'Athletes'], ['extra_supporters', 'Supporters'], ['extra_children', 'Children']].map(([field, label]) => (
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
                                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatMoney(p.amount, cur)}</td>
                                    <td className="py-2 pr-3 whitespace-nowrap">{METHOD_LABELS[p.payment_method] || '—'}</td>
                                    <td className="py-2 pr-3 text-gray-600">{p.note}</td>
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
