import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Modal, formatMoney } from './format';

// Review and apply calculated accommodation to participants' fees.
// New fee = current fee − accommodation applied before + new accommodation.
export default function ApplyAccommodationModal({ competition, participants, accommodation, onClose }) {
    const cur = competition.currency;
    const rows = useMemo(() => participants
        .filter((p) => p.status !== 'cancelled')
        .map((p) => {
            const amount = accommodation?.participants?.[p.id] ?? 0;
            const applied = p.accommodation_applied || 0;
            return { p, amount, applied, newFee: Math.max(0, p.fee_amount - applied + amount) };
        })
        .filter((r) => Math.round((r.amount - r.applied) * 100) !== 0), [participants, accommodation]);

    const [selected, setSelected] = useState(() => rows.map((r) => r.p.id));
    const [processing, setProcessing] = useState(false);
    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const apply = () => {
        setProcessing(true);
        router.post(`/payments/competition-fees/${competition.id}/apply-accommodation`, { participant_ids: selected }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Modal title="Update fees with accommodation" onClose={onClose} wide>
            {rows.length === 0 ? (
                <p className="text-sm text-gray-600">All fees already include the current accommodation.</p>
            ) : (
                <>
                    <p className="text-sm text-gray-600 mb-3">
                        The accommodation part of each fee is replaced with the newly calculated amount. Other parts of the fee stay as they are.
                    </p>
                    <div className="border rounded-md divide-y max-h-[50vh] overflow-y-auto text-sm">
                        {rows.map(({ p, amount, applied, newFee }) => (
                            <label key={p.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                                <span className="flex-1">{p.member.name}</span>
                                <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                    acc. {formatMoney(applied, cur)} → <strong className="text-gray-800">{formatMoney(amount, cur)}</strong>
                                </span>
                                <span className="tabular-nums whitespace-nowrap">
                                    {formatMoney(p.fee_amount, cur)} → <strong>{formatMoney(newFee, cur)}</strong>
                                </span>
                            </label>
                        ))}
                    </div>
                </>
            )}
            <div className="flex gap-3 pt-4">
                {rows.length > 0 && (
                    <button type="button" onClick={apply} disabled={processing || selected.length === 0} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        Update {selected.length} fee(s)
                    </button>
                )}
                <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                    Close
                </button>
            </div>
        </Modal>
    );
}
