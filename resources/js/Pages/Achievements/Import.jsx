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
            <div className="py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Import Achievements</h1>
                        <p className="text-gray-600 mt-1">Upload a CSV file with member achievements</p>
                    </div>
                    <Link
                        href="/my-achievements"
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        ← Back to Achievements
                    </Link>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        {flash.error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Form */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV File</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select File
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {file && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Selected: {file.name}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!file || processing}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Processing...' : 'Upload and Import'}
                            </button>
                        </form>
                    </div>

                    {/* Instructions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">CSV Format</h2>
                        <p className="text-gray-600 mb-4">
                            Your CSV file should contain the following columns:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                            <li><strong>membership_number</strong> - Member's ID number</li>
                            <li><strong>competition class</strong> - Competition category</li>
                            <li><strong>medal</strong> - Medal type (GOLD, SILVER, BRONZE)</li>
                            <li><strong>Event name</strong> - Name of the event/competition</li>
                        </ul>

                        <div className="bg-gray-50 rounded p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Example:</p>
                            <pre className="text-xs text-gray-600 overflow-x-auto">
membership_number,competition class,medal,Event name
4,SM Premier Mixed 500m,GOLD,National 2025
5,SM Premier Mixed 200m,SILVER,National 2025
                            </pre>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> The import will automatically match members by their membership number and extract the year from the event name.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
