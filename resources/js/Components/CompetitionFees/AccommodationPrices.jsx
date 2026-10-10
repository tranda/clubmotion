import { useForm } from '@inertiajs/react';
import { formatMoney } from './format';

const SIZES = [1, 2, 3, 4, 5];
const LABELS = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad', 5: '5-bed' };
const input = 'w-full border border-gray-300 rounded px-2 py-1 bg-white text-sm';

// Accommodation prices for a competition (per person, whole package), inside the room planner.
export default function AccommodationPrices({ competition, accommodation }) {
    const settings = accommodation?.settings || { prices: {}, supporter_discount: 0, charge_empty_beds: true };
    const cur = competition.currency;
    const { data, setData, put, processing, isDirty } = useForm({
        prices: Object.fromEntries(SIZES.map((s) => [s, settings.prices?.[s] ?? ''])),
        supporter_discount: settings.supporter_discount || '',
        charge_empty_beds: settings.charge_empty_beds ?? true,
    });
    const types = competition.room_types?.length ? competition.room_types : SIZES;

    const save = (e) => {
        e.preventDefault();
        put(`/payments/competition-fees/${competition.id}/accommodation`, { preserveScroll: true, preserveState: true });
    };

    return (
        <details className="mb-4 rounded-md border border-gray-200 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Prices
                {accommodation?.total > 0 && <span className="text-gray-500"> · total {formatMoney(accommodation.total, cur)}</span>}
            </summary>
            <form onSubmit={save} className="mt-2 space-y-3">
                <p className="text-xs text-gray-500">
                    Price per person for the whole stay{accommodation?.package_nights ? ` (${accommodation.package_nights} nights, default dates)` : ''}.
                    Other stay lengths are pro-rated by nights. Children are free and take no bed.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {types.map((s) => (
                        <div key={s}>
                            <label className="block text-xs text-gray-500 mb-1">{LABELS[s]} ({cur})</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.prices[s]}
                                onChange={(e) => setData('prices', { ...data.prices, [s]: e.target.value })}
                                className={input}
                            />
                            {data.prices[s] !== '' && (
                                <div className="text-[11px] text-gray-400 mt-0.5">room {formatMoney(data.prices[s] * s, cur)}</div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Supporter discount ({cur})</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={data.supporter_discount}
                            onChange={(e) => setData('supporter_discount', e.target.value)}
                            className={`${input} w-32`}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm pb-1">
                        <input type="checkbox" checked={data.charge_empty_beds} onChange={(e) => setData('charge_empty_beds', e.target.checked)} />
                        Charge empty beds (a room not full is split among the people in it)
                    </label>
                    <button type="submit" disabled={processing || !isDirty} className="ml-auto px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-gray-300">
                        Save prices
                    </button>
                </div>
            </form>
        </details>
    );
}
