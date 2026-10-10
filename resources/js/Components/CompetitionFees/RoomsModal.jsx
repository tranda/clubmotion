import { useForm } from '@inertiajs/react';
import { Modal, inputClass } from './format';

// Rooms available for a competition, by number of beds.
export default function RoomsModal({ competition, onClose }) {
    const { data, setData, put, processing, errors } = useForm({ rooms: { ...competition.room_counts } });

    const submit = (e) => {
        e.preventDefault();
        put(`/payments/competition-fees/${competition.id}/rooms`, { preserveScroll: true, onSuccess: () => onClose() });
    };

    return (
        <Modal title="Rooms available" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((beds) => (
                        <div key={beds}>
                            <label className="block text-xs text-gray-500 mb-1">{beds}-bed</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={data.rooms[beds] ?? 0}
                                onChange={(e) => setData('rooms', { ...data.rooms, [beds]: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                className={inputClass}
                            />
                            {errors[`rooms.${beds}`] && <p className="mt-1 text-xs text-red-600">{errors[`rooms.${beds}`]}</p>}
                        </div>
                    ))}
                </div>
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
