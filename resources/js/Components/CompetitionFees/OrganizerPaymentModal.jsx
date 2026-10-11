import { useForm } from '@inertiajs/react';
import { Modal, METHOD_LABELS, inputClass, todayIso } from './format';

// Add or edit a payment to the competition's organizer (posted to the Ledger as an expense).
export default function OrganizerPaymentModal({ competition, payment, ledgerCategories, defaultCategoryId, onClose }) {
    const { data, setData, post, put, processing, errors } = useForm({
        amount: payment?.amount ?? '',
        paid_at: payment?.paid_at ?? todayIso(),
        payment_method: payment?.payment_method ?? 'bank_transfer',
        description: payment?.description ?? '',
        ledger_category_id: payment?.ledger_category_id ?? defaultCategoryId ?? '',
        note: payment?.note ?? '',
        post_to_ledger: payment?.post_to_ledger ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onClose() };
        if (payment) put(`/payments/competition-fees/organizer-payments/${payment.id}`, options);
        else post(`/payments/competition-fees/${competition.id}/organizer-payments`, options);
    };

    const error = (field) => errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>;

    return (
        <Modal title={payment ? 'Edit payment to organizer' : 'Payment to organizer'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({competition.currency})</label>
                        <input type="number" min="0.01" step="0.01" required value={data.amount} onChange={(e) => setData('amount', e.target.value)} className={inputClass} />
                        {error('amount')}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" required value={data.paid_at} onChange={(e) => setData('paid_at', e.target.value)} className={inputClass} />
                        {error('paid_at')}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                        <select value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)} className={inputClass}>
                            {['bank_transfer', 'cash', 'other'].map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ledger category</label>
                        <select value={data.ledger_category_id} onChange={(e) => setData('ledger_category_id', e.target.value)} className={inputClass}>
                            <option value="">— none —</option>
                            {ledgerCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {error('ledger_category_id')}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
                    <input value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="e.g. Entry fees, Accommodation deposit" className={inputClass} />
                    {error('description')}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input value={data.note} onChange={(e) => setData('note', e.target.value)} className={inputClass} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.post_to_ledger} onChange={(e) => setData('post_to_ledger', e.target.checked)} />
                    Post to Ledger (paid from the club's cash or account)
                </label>
                <p className="text-xs text-gray-500">
                    {!data.post_to_ledger
                        ? 'Recorded for this competition only; nothing is added to the Ledger.'
                        : data.payment_method === 'other'
                            ? '"Other" payments are not posted to the Ledger.'
                            : 'Posted to the Ledger as an expense; editing or deleting it there updates this payment too.'}
                </p>
                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={processing} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        Save
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}
