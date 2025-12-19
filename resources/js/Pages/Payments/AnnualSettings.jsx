import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function AnnualSettings({ settings }) {
    const [formData, setFormData] = useState({
        annual_amount: settings?.annual_amount || 32000,
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);

        router.put('/payments/annual-settings', formData, {
            onFinish: () => setIsSaving(false),
        });
    };

    return (
        <Layout>
            <div className="py-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Annual Payment Settings</h1>
                    <Link
                        href="/payments"
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        Back to Payments
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow p-6 max-w-xl">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Annual Payment Amount (RSD)
                                </label>
                                <input
                                    type="number"
                                    value={formData.annual_amount}
                                    onChange={(e) => setFormData({...formData, annual_amount: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Fixed amount for 12-month annual payment
                                </p>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded p-4">
                                <h3 className="font-medium text-purple-800 mb-2">How Annual Payments Work</h3>
                                <ul className="text-sm text-purple-700 space-y-1">
                                    <li>Members can pay {Number(formData.annual_amount).toLocaleString()} RSD for 12 months</li>
                                    <li>Payment covers 12 consecutive months from start date</li>
                                    <li>Can span across calendar years (e.g., Jul 2025 - Jun 2026)</li>
                                    <li>All covered months are marked with purple "A" indicator</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
