import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ImportAttendance() {
    const { flash, errors } = usePage().props;
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!file) {
            alert('Please select a CSV file to import');
            return;
        }

        const formData = new FormData();
        formData.append('csv_file', file);

        setProcessing(true);

        router.post('/attendance/import', formData, {
            forceFormData: true,
            onSuccess: () => {
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
                alert('Import failed. Check error messages.');
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Import Attendance from CSV</h1>

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
                                <h3 className="font-medium text-blue-900 mb-3">📋 CSV Format</h3>

                                <div className="space-y-3 text-sm text-blue-800">
                                    <div>
                                        <p className="font-medium mb-1">Expected Format:</p>
                                        <code className="bg-white px-2 py-1 rounded text-xs block">
                                            Ime i prezime, Članski broj, 4-Sep, 5-Sep, 6-Sep, 7-Sep, ...
                                        </code>
                                    </div>

                                    <div className="bg-white rounded p-3 mt-2">
                                        <p className="font-medium mb-2">Example:</p>
                                        <code className="text-xs block">
                                            Ime i prezime,Članski broj,4-Sep,5-Sep,6-Sep<br/>
                                            Zoran Trandafilović,6,TRUE,TRUE,TRUE<br/>
                                            Snežana Rajh,5,TRUE,FALSE,TRUE
                                        </code>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-300 rounded p-2 mt-2">
                                        <p className="font-medium">✨ Import Features:</p>
                                        <ul className="list-disc ml-5 mt-1">
                                            <li>Date columns auto-detected (format: DD-MMM, e.g., 4-Sep)</li>
                                            <li>Matches members by membership number (second column)</li>
                                            <li>Creates sessions with "Training" type by default</li>
                                            <li>TRUE/FALSE values mark attendance</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Value Types */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">📝 Cell Values</h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li><strong>TRUE</strong> → Member attended session</li>
                                    <li><strong>FALSE</strong> → Member did not attend</li>
                                    <li><strong>Empty</strong> → Treated as FALSE</li>
                                </ul>
                            </div>

                            {/* Session Type Selection */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-medium text-purple-900 mb-2">🎯 Session Type</h3>
                                <p className="text-sm text-purple-800">
                                    All imported sessions will be created as <strong>"Training"</strong> type.
                                    You can manually change session types after import if needed.
                                </p>
                            </div>

                            {/* Warning */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h3 className="font-medium text-orange-900 mb-2">⚠️ Important Notes</h3>
                                <ul className="text-sm text-orange-800 space-y-1">
                                    <li>• This will <strong>CREATE or UPDATE</strong> attendance records</li>
                                    <li>• Sessions will be created if they don't exist for the dates</li>
                                    <li>• Maximum file size: 5 MB</li>
                                    <li>• Ensure all membership numbers exist in the system</li>
                                    <li>• First row must contain column headers</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.get('/attendance')}
                                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                    disabled={processing}
                                >
                                    {processing ? 'Importing...' : 'Import Attendance'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Success Message */}
                    {flash?.success && (
                        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800">{flash.success}</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {flash?.error && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">{flash.error}</p>
                        </div>
                    )}

                    {/* Validation Errors */}
                    {errors?.csv_file && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">{errors.csv_file}</p>
                        </div>
                    )}

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
