import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function InitializeYear({ year, memberCount, presets = [] }) {
    const [monthlyRates, setMonthlyRates] = useState({
        1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
        7: '', 8: '', 9: '', 10: '', 11: '', 12: ''
    });

    const monthNames = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (confirm(`This will create ${memberCount * 12} payment records for ${year}. Continue?`)) {
            router.post('/payments/initialize', {
                year,
                monthly_rates: monthlyRates
            });
        }
    };

    const setRangeRates = (start, end, value) => {
        const newRates = { ...monthlyRates };
        for (let i = start; i <= end; i++) {
            newRates[i] = value;
        }
        setMonthlyRates(newRates);
    };

    const clearAll = () => {
        setMonthlyRates({
            1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
            7: '', 8: '', 9: '', 10: '', 11: '', 12: ''
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Initialize Payment Year - {year}</h1>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-2">Overview</h2>
                        <p className="text-gray-600">
                            This will create payment records for all {memberCount} active members for the year {year}.
                            Total records to be created: <strong>{memberCount * 12}</strong>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-md font-semibold">Set Expected Monthly Rates (RSD)</h3>
                                <Link
                                    href="/payments/presets"
                                    className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                    Manage Presets
                                </Link>
                            </div>

                            {/* Dynamic preset buttons */}
                            <div className="mb-4 flex gap-2 flex-wrap">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => setRangeRates(preset.start_month, preset.end_month, preset.rate)}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                                >
                                    Clear all
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                {Object.keys(monthNames).map(month => (
                                    <div key={month}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {monthNames[month]}
                                        </label>
                                        <input
                                            type="number"
                                            value={monthlyRates[month]}
                                            onChange={(e) => setMonthlyRates({
                                                ...monthlyRates,
                                                [month]: e.target.value
                                            })}
                                            placeholder="0"
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">What will happen:</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>✓ Create 12 payment records for each of {memberCount} active members</li>
                                <li>✓ Members marked as "pocasni" or "saradnik" will be auto-exempted</li>
                                <li>✓ Expected amounts will be set according to your rates above</li>
                                <li>✓ All payments will start with "pending" status (except exempted members)</li>
                                <li>✓ Existing records for {year} will NOT be duplicated</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.get('/payments')}
                                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Initialize {year} Payments
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
