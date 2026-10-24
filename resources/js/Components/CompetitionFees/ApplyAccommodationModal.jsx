import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Modal, formatMoney } from './format';

// Review and apply calculated accommodation to participants' fees.
// "replace": fee = accommodation (existing fee such as a deposit is included).
// "add": fee = current fee − accommodation applied before + new accommodation.
export default function ApplyAccommodationModal({ competition, participants, accommodation, onClose }) {
    const cur = competition.currency;
    const [mode, setMode] = useState('replace');
    const rows = useMemo(() => participants
        .filter((p) => p.status !== 'cancelled')
        .map((p) => {
            const amount = accommodation?.participants?.[p.id] ?? 0;
            const applied = p.accommodation_applied || 0;
            const newFee = mode === 'replace' ? amount : Math.max(0, p.fee_amount - applied + amount);
            return { p, amount, applied, newFee };
        })
        // Changed fee, or accommodation differing from what was last applied.
        .filter((r) => Math.round((r.newFee - r.p.fee_amount) * 100) !== 0 || Math.round((r.amount - r.applied) * 100) !== 0), [participants, accommodation, mode]);

    // All changed rows selected by default; unticked ones are remembered.
    const [unselected, setUnselected] = useState([]);
    const selected = rows.map((r) => r.p.id).filter((id) => !unselected.includes(id));
    const [processing, setProcessing] = useState(false);
    const toggle = (id) => setUnselected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const apply = () => {
        setProcessing(true);
        router.post(`/payments/competition-fees/${competition.id}/apply-accommodation`, { participant_ids: selected, mode }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Modal title="Update fees with accommodation" onClose={onClose} wide>
            <div className="mb-3 space-y-1 text-sm">
                <label className="flex items-start gap-2">
                    <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-1" />
                    <span><strong>Fee = accommodation</strong> <span className="text-gray-500">— the current fee (e.g. a deposit) is included in it</span></span>
                </label>
                <label className="flex items-start gap-2">
                    <input type="radio" checked={mode === 'add'} onChange={() => setMode('add')} className="mt-1" />
                    <span><strong>Fee + accommodation</strong> <span className="text-gray-500">— keep the current fee and add accommodation on top</span></span>
                </label>
            </div>
            {rows.length === 0 ? (
                <p className="text-sm text-gray-600">All fees already match.</p>
            ) : (
                <>
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
