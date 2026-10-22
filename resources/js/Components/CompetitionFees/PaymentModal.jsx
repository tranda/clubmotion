import { useForm } from '@inertiajs/react';
import { Modal, METHOD_LABELS, formatMoney, inputClass, todayIso } from './format';

// Add a payment for a participant, or edit an existing one (`payment`).
export default function PaymentModal({ competition, participant, payment = null, paymentMethods, onClose }) {
    const { data, setData, post, put, processing, errors } = useForm({
        amount: payment?.amount ?? (participant.remaining_amount > 0 ? participant.remaining_amount : ''),
        paid_at: payment?.paid_at || todayIso(),
        currency: payment?.currency || competition.currency,
        currency_amount: payment?.currency_amount ?? '',
        payment_method: payment?.payment_method || 'cash',
        note: payment?.note || '',
        post_to_ledger: payment?.post_to_ledger ?? false,
    });

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onClose() };
        if (payment) {
            put(`/payments/competition-fees/payments/${payment.id}`, options);
        } else {
            post(`/payments/competition-fees/participants/${participant.id}/payments`, options);
        }
    };

    return (
        <Modal title={payment ? 'Edit Payment' : 'Add Competition Payment'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div className="text-sm space-y-1">
                    <div><span className="text-gray-500">Member:</span> <span className="font-medium">{participant.member.name}</span></div>
                    <div><span className="text-gray-500">Competition:</span> <span className="font-medium">{competition.name}</span></div>
                    <div><span className="text-gray-500">Remaining:</span> {formatMoney(participant.remaining_amount, competition.currency)}</div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select value={data.currency} onChange={(e) => setData('currency', e.target.value)} className={inputClass}>
                            {['EUR', 'RSD'].map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {data.currency !== competition.currency ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paid ({data.currency})</label>
                                <input type="number" min="0.01" step="0.01" required value={data.currency_amount} onChange={(e) => setData('currency_amount', e.target.value)} className={inputClass} />
                                {errors.currency_amount && <p className="mt-1 text-sm text-red-600">{errors.currency_amount}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Counts as ({competition.currency})</label>
                                <input type="number" min="0.01" step="0.01" required value={data.amount} onChange={(e) => setData('amount', e.target.value)} className={inputClass} />
                                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({competition.currency})</label>
                            <input type="number" min="0.01" step="0.01" required value={data.amount} onChange={(e) => setData('amount', e.target.value)} className={inputClass} />
                            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" required value={data.paid_at} onChange={(e) => setData('paid_at', e.target.value)} className={inputClass} />
                    {errors.paid_at && <p className="mt-1 text-sm text-red-600">{errors.paid_at}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                    <select value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)} className={inputClass}>
                        {paymentMethods.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={data.post_to_ledger} onChange={(e) => setData('post_to_ledger', e.target.checked)} />
                        Post to Ledger (paid into the club's cash or account)
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        {!data.post_to_ledger || data.payment_method === 'other'
                            ? 'Not posted to the Ledger.'
                            : `Posted to the Ledger (${data.payment_method === 'cash' ? 'cash' : 'bank'}, ${data.currency}).`}
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input type="text" maxLength="255" value={data.note} onChange={(e) => setData('note', e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={processing} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {payment ? 'Save' : 'Add Payment'}
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}
