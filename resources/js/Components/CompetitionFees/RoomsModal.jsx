import { useForm } from '@inertiajs/react';
import { Modal } from './format';

// Room types (by number of beds) available for a competition.
export default function RoomsModal({ competition, onClose }) {
    const { data, setData, put, processing, errors } = useForm({ room_types: competition.room_types || [] });

    const toggle = (beds) =>
        setData('room_types', data.room_types.includes(beds)
            ? data.room_types.filter((b) => b !== beds)
            : [...data.room_types, beds].sort());

    const submit = (e) => {
        e.preventDefault();
        put(`/payments/competition-fees/${competition.id}/rooms`, { preserveScroll: true, onSuccess: () => onClose() });
    };

    return (
        <Modal title="Room types available" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((beds) => (
                        <label key={beds} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={data.room_types.includes(beds)} onChange={() => toggle(beds)} />
                            {beds}-bed room
                        </label>
                    ))}
                </div>
                {errors.room_types && <p className="text-sm text-red-600">{errors.room_types}</p>}
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
