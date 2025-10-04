import { useState, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Import() {
    const { flash } = usePage().props;
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Pull to refresh
    useEffect(() => {
        let startY = 0;
        let isPulling = false;

        const handleTouchStart = (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        };

        const handleTouchMove = (e) => {
            if (!isPulling) return;
            const currentY = e.touches[0].pageY;
            const pullDistance = currentY - startY;
            if (pullDistance > 100) {
                isPulling = false;
                router.reload();
            }
        };

        const handleTouchEnd = () => {
            isPulling = false;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!file) {
            alert('Please select a file to upload');
            return;
        }

        setProcessing(true);

        const formData = new FormData();
        formData.append('file', file);

        router.post('/achievements/import', formData, {
            onFinish: () => {
                setProcessing(false);
                setFile(null);
            },
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Import Achievements from CSV</h1>

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
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {file && (
                                    <div className="mt-2 text-sm text-green-600">
                                        <p className="font-semibold">Selected: {file.name}</p>
                                    </div>
                                )}
                            </div>

                            {/* CSV Format Instructions */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-900 mb-3">📋 CSV Format</h3>

                                <div className="space-y-3 text-sm text-blue-800">
                                    <div>
                                        <p className="font-medium mb-1">Expected Format:</p>
                                        <code className="bg-white px-2 py-1 rounded text-xs block">
                                            membership_number, competition class, medal, Event name
                                        </code>
                                    </div>

                                    <div className="bg-white rounded p-3 mt-2">
                                        <p className="font-medium mb-2">Example:</p>
                                        <code className="text-xs block">
                                            membership_number,competition class,medal,Event name<br/>
                                            4,SM Premier Mixed 500m,GOLD,National 2025<br/>
                                            5,SM Premier Mixed 200m,SILVER,National 2025
                                        </code>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-300 rounded p-2 mt-2">
                                        <p className="font-medium">✨ Import Features:</p>
                                        <ul className="list-disc ml-5 mt-1">
                                            <li>Matches members by membership number</li>
                                            <li>Automatically extracts year from Event name (e.g., "National 2025" → 2025)</li>
                                            <li>Medal types: GOLD, SILVER, BRONZE</li>
                                            <li>Duplicate prevention (updates existing achievements)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Column Descriptions */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">📝 Column Details</h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li><strong>membership_number</strong> → Member's ID (must exist in system)</li>
                                    <li><strong>competition class</strong> → Competition category/class</li>
                                    <li><strong>medal</strong> → GOLD, SILVER, or BRONZE</li>
                                    <li><strong>Event name</strong> → Event/competition name (include year)</li>
                                </ul>
                            </div>

                            {/* Warning */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h3 className="font-medium text-orange-900 mb-2">⚠️ Important Notes</h3>
                                <ul className="text-sm text-orange-800 space-y-1">
                                    <li>• This will <strong>CREATE or UPDATE</strong> achievement records</li>
                                    <li>• Ensure all membership numbers exist in the system</li>
                                    <li>• First row must contain column headers</li>
                                    <li>• Rows with missing data will be skipped</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.get('/my-achievements')}
                                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                    disabled={processing || !file}
                                >
                                    {processing ? 'Importing...' : 'Import Achievements'}
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
                </div>
            </div>
        </Layout>
    );
}
