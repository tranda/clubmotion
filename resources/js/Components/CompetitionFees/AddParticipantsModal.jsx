import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Modal, formatMoney, inputClass } from './format';

// Pick club members to add to a competition. Active members only by default.
export default function AddParticipantsModal({ competition, members, onClose }) {
    const [selected, setSelected] = useState([]);
    const [showInactive, setShowInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [useDefaultFee, setUseDefaultFee] = useState(competition.default_fee !== null);
    const [fee, setFee] = useState(competition.default_fee ?? '');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members.filter((m) => (showInactive || m.is_active) && (!q || m.name.toLowerCase().includes(q)));
    }, [members, showInactive, search]);

    const allSelected = visible.length > 0 && visible.every((m) => selected.includes(m.id));

    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const toggleAll = () =>
        setSelected((s) =>
            allSelected ? s.filter((id) => !visible.some((m) => m.id === id)) : [...new Set([...s, ...visible.map((m) => m.id)])]
        );

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        router.post(
            `/payments/competition-fees/${competition.id}/participants`,
            { member_ids: selected, use_default_fee: useDefaultFee, fee_amount: useDefaultFee ? null : fee },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: (errs) => setErrors(errs),
                onFinish: () => setProcessing(false),
            }
        );
    };

    return (
        <Modal title="Add Participants" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Search members…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={inputClass}
                />
                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 font-medium">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={visible.length === 0} />
                        Select All
                    </label>
                    <label className="flex items-center gap-2 text-gray-600">
                        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                        Show inactive
                    </label>
                </div>
                <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {visible.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No members to add.</div>
                    ) : (
                        visible.map((m) => (
                            <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                                <span className={m.is_active ? '' : 'text-gray-400'}>{m.name}</span>
                                {!m.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                            </label>
                        ))
                    )}
                </div>
                {errors.member_ids && <p className="text-sm text-red-600">{errors.member_ids}</p>}

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={useDefaultFee}
                            onChange={(e) => setUseDefaultFee(e.target.checked)}
                        />
                        Use default competition fee: {competition.default_fee !== null ? formatMoney(competition.default_fee, competition.currency) : 'not set (0)'}
                    </label>
                    {!useDefaultFee && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fee for selected members ({competition.currency})</label>
                            <input type="number" min="0" step="0.01" required value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
                            {errors.fee_amount && <p className="mt-1 text-sm text-red-600">{errors.fee_amount}</p>}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={processing || selected.length === 0}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        Add {selected.length || ''} {selected.length === 1 ? 'participant' : 'participants'}
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}
