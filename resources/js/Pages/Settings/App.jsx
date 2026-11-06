import { Head, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import DatabaseUpdates from '../../Components/DatabaseUpdates';

// Settings → App settings (admins only): app-level maintenance.
export default function AppSettings({ database }) {
    return (
        <Layout>
            <Head title="App settings" />
            <div className="max-w-2xl mx-auto py-6 space-y-6">
                <div>
                    <Link href="/settings" className="text-sm text-blue-600 hover:text-blue-800">← Settings</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">App settings</h1>
                </div>

                <section className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900">Database updates</h2>
                    <p className="text-sm text-gray-600">
                        Some new versions come with database changes. Apply them here after a deploy, instead of running <code>php artisan migrate</code> from the hosting panel.
                    </p>
                    <DatabaseUpdates status={database} />
                </section>
            </div>
        </Layout>
    );
}
