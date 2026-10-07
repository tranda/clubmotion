import { useForm } from '@inertiajs/react';
import { Modal, inputClass } from './format';

// Create or edit a competition. Pass `competition` to edit.
export default function CompetitionFormModal({ competition = null, currencies, onClose }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: competition?.name || '',
        location: competition?.location || '',
        start_date: competition?.start_date || '',
        end_date: competition?.end_date || '',
        default_fee: competition?.default_fee ?? '',
        currency: competition?.currency || 'EUR',
        status: competition?.status || 'active',
        notes: competition?.notes || '',
    });

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onClose() };
        if (competition) {
            put(`/payments/competition-fees/${competition.id}`, options);
        } else {
            post('/payments/competition-fees', options);
        }
    };

    const field = (label, name, input) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {input}
            {errors[name] && <p className="mt-1 text-sm text-red-600">{errors[name]}</p>}
        </div>
    );

    return (
        <Modal title={competition ? 'Edit Competition' : 'Add Competition'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                {field('Name', 'name',
                    <input type="text" required value={data.name} onChange={(e) => setData('name', e.target.value)} className={inputClass} />
                )}
                {field('Location', 'location',
                    <input type="text" value={data.location} onChange={(e) => setData('location', e.target.value)} className={inputClass} />
                )}
                <div className="grid grid-cols-2 gap-3">
                    {field('Start date', 'start_date',
                        <input type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} className={inputClass} />
                    )}
                    {field('End date', 'end_date',
                        <input type="date" min={data.start_date || undefined} value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} className={inputClass} />
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {field('Default fee', 'default_fee',
                        <input type="number" min="0" step="0.01" value={data.default_fee} onChange={(e) => setData('default_fee', e.target.value)} className={inputClass} />
                    )}
                    {field('Currency', 'currency',
                        <select value={data.currency} onChange={(e) => setData('currency', e.target.value)} className={inputClass}>
                            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>
                {competition && data.default_fee !== (competition.default_fee ?? '') && (
                    <p className="text-xs text-gray-500">Changing the default fee only applies to participants added later.</p>
                )}
                {field('Status', 'status',
                    <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputClass}>
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                    </select>
                )}
                {field('Notes', 'notes',
                    <textarea rows="2" value={data.notes} onChange={(e) => setData('notes', e.target.value)} className={inputClass} />
                )}
                <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={processing} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {competition ? 'Save' : 'Create'}
                    </button>
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}
