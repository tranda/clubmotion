import { Link, usePage } from '@inertiajs/react';
import Layout from '../../Components/Layout';

// Settings home (admin & superuser): club-wide configuration.
const SECTIONS = [
    { href: '/settings/member-card', title: 'Member card', text: 'Design of the digital member card (layout and custom background).' },
    { href: '/settings/events', title: 'Events platform', text: 'Connection to events.motion.rs and syncing member data (EDBF ID, birth date, gender).' },
    { href: '/settings/categories', title: 'Member categories', text: 'IDBF categories and age ranges used to assign members automatically.' },
];

// Shown to admins only.
const ADMIN_SECTIONS = [
    { href: '/settings/app', title: 'App settings', text: 'App maintenance, such as database updates after a new version.' },
];

export default function SettingsIndex() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role?.name === 'admin';
    const sections = isAdmin ? [...SECTIONS, ...ADMIN_SECTIONS] : SECTIONS;

    return (
        <Layout>
            <div className="max-w-3xl mx-auto py-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
                <div className="space-y-3">
                    {sections.map((s) => (
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
