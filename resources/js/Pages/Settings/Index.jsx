import { Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

// Settings home (admin & superuser): club-wide configuration.
const SECTIONS = [
    { href: '/settings/categories', title: 'Member categories', text: 'IDBF categories and age ranges used to assign members automatically.' },
];

export default function SettingsIndex() {
    return (
        <Layout>
            <div className="max-w-3xl mx-auto py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
                <div className="space-y-3">
                    {SECTIONS.map((s) => (
                        <Link key={s.href} href={s.href} className="flex items-center justify-between bg-white rounded-lg shadow p-4 hover:bg-gray-50">
                            <span>
                                <span className="block font-semibold text-gray-900">{s.title}</span>
                                <span className="block text-sm text-gray-600">{s.text}</span>
                            </span>
                            <span className="text-blue-600">→</span>
                        </Link>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
