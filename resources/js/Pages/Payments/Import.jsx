import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Import() {
    const { flash } = usePage().props;
    const [file, setFile] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!file) {
            alert('Please select a CSV file to import');
            return;
        }

        const formData = new FormData();
        formData.append('csv_file', file);

        router.post('/payments/import', formData, {
            forceFormData: true,
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Import Payments from CSV</h1>

                <div className="bg-white rounded-lg shadow p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Upload CSV File
                                </label>
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {file && (
                                    <p className="mt-2 text-sm text-green-600">
                                        Selected: {file.name}
                                    </p>
                                )}
                            </div>

                            {/* CSV Format Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 mb-3">📋 CSV Format (Auto-Detects Year & Month)</h3>

                                <div className="space-y-3 text-sm text-blue-800">
                                    <div>
                                        <p className="font-medium mb-1">Column Format:</p>
                                        <code className="bg-white px-2 py-1 rounded text-xs block">
                                            Članski broj, Email, jAN 2022, fEB 2022, mAR 2022, ..., JAN 2023, FEB 2023, ...
                                        </code>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-300 rounded p-2 mt-2">
                                        <p className="font-medium">✨ Smart Import:</p>
                                        <ul className="list-disc ml-5 mt-1">
                                            <li>Automatically detects year and month from column headers</li>
                                            <li>Supports multiple years in one file (2022, 2023, 2024, 2025...)</li>
                                            <li>Handles Serbian month names (mAJ, oKT, etc.)</li>
                                            <li>First column: Membership Number, Second: Email</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Value Types */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">📝 Cell Values</h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li><strong>Numbers</strong> (e.g., 2500, 1000) → Marked as <span className="text-green-600 font-semibold">paid</span></li>
                                    <li><strong>"pocasni"</strong> → Marked as <span className="text-gray-600 font-semibold">exempt</span> (honorary member)</li>
                                    <li><strong>"saradnik"</strong> → Marked as <span className="text-gray-600 font-semibold">exempt</span> (associate)</li>
                                    <li><strong>"free"</strong> → Marked as <span className="text-gray-600 font-semibold">exempt</span></li>
                                    <li><strong>Empty</strong> → Skipped (no record created)</li>
                                </ul>
                            </div>

                            {/* Matching Logic */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-medium text-yellow-900 mb-2">🔍 Member Matching Priority</h3>
                                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                                    <li>Try to match by <strong>Membership Number</strong> (first column)</li>
                                    <li>If not found, match by <strong>Email</strong> (second column)</li>
                                    <li>If neither matches, skip row and log error</li>
                                </ol>
                            </div>

                            {/* Warning */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h3 className="font-medium text-orange-900 mb-2">⚠️ Important Notes</h3>
                                <ul className="text-sm text-orange-800 space-y-1">
                                    <li>• This will <strong>UPDATE</strong> existing payment records if they exist</li>
                                    <li>• Maximum file size: 5 MB</li>
                                    <li>• Ensure all member emails/numbers exist in the system</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.get('/payments')}
                                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Import Payments
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Show import errors if any */}
                    {flash?.import_errors && flash.import_errors.length > 0 && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-medium text-red-900 mb-2">Import Errors:</h4>
                            <ul className="text-sm text-red-800 space-y-1">
                                {flash.import_errors.map((error, idx) => (
                                    <li key={idx}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
