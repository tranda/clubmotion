import { Modal, StatusBadge, METHOD_LABELS, formatDate, formatMoney, paidLabel } from './format';

// A guest placed in another room: their accommodation share and the payments
// recorded for them. Payments count towards the fee of the participant who brought them.
export default function GuestModal({ competition, unit, info, onAddPayment, onEditPayment, onDeletePayment, onOpenParticipant, onClose }) {
    const cur = competition.currency;
    const p = unit.participant;
    const payments = (p.payments || []).filter((pay) => pay.party_slot === unit.slot);

    return (
        <Modal title={unit.label} onClose={onClose} wide>
            <div className="-mt-3 mb-4 text-sm text-gray-600">
                Guest of{' '}
                <button type="button" onClick={onOpenParticipant} className="text-blue-600 hover:text-blue-800">{p.member.name}</button>
                {' '}· payments count towards {p.member.name.split(' ')[0]}'s fee
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">Accommodation share</div>
                    <div className="font-semibold">{formatMoney(info.share, cur)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">Paid</div>
                    <div className="font-semibold text-green-700">{formatMoney(info.paid, cur)}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500">{info.overpaid > 0 ? 'Overpaid' : 'Remaining'}</div>
                    <div className={`font-semibold ${info.overpaid > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {formatMoney(info.overpaid > 0 ? info.overpaid : info.remaining, cur)}
                    </div>
                </div>
            </div>
            <div className="mb-4"><StatusBadge status={info.status} /></div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">Payment History</h3>
                <button onClick={onAddPayment} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    + Payment
                </button>
            </div>
            {payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments for this guest yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase border-b">
                                <th className="py-2 pr-3">Date</th>
                                <th className="py-2 pr-3 text-right">Amount</th>
                                <th className="py-2 pr-3">Method</th>
                                <th className="py-2 pr-3">Paid by / note</th>
                                <th className="py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.map((pay) => (
                                <tr key={pay.id}>
                                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(pay.paid_at)}</td>
                                    <td className="py-2 pr-3 text-right whitespace-nowrap">{paidLabel(pay, cur)}</td>
                                    <td className="py-2 pr-3 whitespace-nowrap">
                                        {METHOD_LABELS[pay.payment_method] || '—'}
                                        {pay.post_to_ledger === false && <span className="block text-xs text-gray-500">not in Ledger</span>}
                                    </td>
                                    <td className="py-2 pr-3 text-gray-600">
                                        {pay.paid_by || p.member.name}
                                        {pay.note && <span className="block text-xs text-gray-500">{pay.note}</span>}
                                    </td>
                                    <td className="py-2 whitespace-nowrap text-right">
                                        <button onClick={() => onEditPayment(pay)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                                        <button onClick={() => onDeletePayment(pay)} className="text-red-600 hover:text-red-800">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 flex justify-between gap-3">
                <button onClick={onOpenParticipant} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
                    Open {p.member.name.split(' ')[0]}'s details
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
            </div>
        </Modal>
    );
}
