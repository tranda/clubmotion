import Layout from '../../Components/Layout';

export default function Index() {
    return (
        <Layout>
            <div className="py-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Payments</h1>

                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Payments Module</h3>
                    <p className="text-gray-600">This section is coming soon. Track and manage membership payments here.</p>
                </div>
            </div>
        </Layout>
    );
}
