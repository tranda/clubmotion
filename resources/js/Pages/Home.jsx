import { Link, usePage } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function Home({ stats }) {
    const { auth, appVersion, clubName } = usePage().props;
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';
    const isAdmin = userRole === 'admin';

    return (
        <Layout>
            <div className="min-h-[calc(100vh-5rem)] flex flex-col py-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome to {clubName || 'ClubMotion'}</h1>
                    <p className="text-sm sm:text-base text-gray-600">{canManage ? 'Manage your club members and payments efficiently' : 'Your club member portal'}</p>
                </div>

                <div className="flex-1">
                    {/* Quick Stats */}
                    <div className="mb-8 bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-4xl font-bold text-green-600">{stats.activeMembers}</p>
                                <p className="text-sm text-gray-600 mt-2">Active Members</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {canManage ? (
                        <>
                            {/* Members Card - Admin/Superuser only */}
                            <Link
                                href="/members"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Members</h2>
                                <p className="text-gray-600">View and manage club members</p>
                            </Link>

                            {/* Attendance Card - Admin/Superuser only */}
                            <Link
                                href="/attendance"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <svg className="w-8 h-8 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance</h2>
                                <p className="text-gray-600">Track member attendance</p>
                            </Link>

                            {/* Payments Card - Admin/Superuser only */}
                            <Link
                                href="/payments"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-yellow-100 rounded-full">
                                        <svg className="w-8 h-8 text-yellow-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Payments</h2>
                                <p className="text-gray-600">Track membership payments</p>
                            </Link>

                            {/* Ledger Card - Admin/Superuser */}
                            {canManage && (
                                <Link
                                    href="/ledger"
                                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-teal-100 rounded-full">
                                            <svg className="w-8 h-8 text-teal-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M9 17v-2a4 4 0 014-4h6m-6 0V7a4 4 0 00-4-4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m6-12l4 4-4 4" />
                                            </svg>
                                        </div>
                                        <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Ledger</h2>
                                    <p className="text-gray-600">Daily cash-book: income, expenses, balances</p>
                                </Link>
                            )}

                            {/* Notes Card - Admin/Superuser */}
                            {canManage && (
                                <Link
                                    href="/notes"
                                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-rose-100 rounded-full">
                                            <svg className="w-8 h-8 text-rose-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </div>
                                        <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Notes</h2>
                                    <p className="text-gray-600">Per-member notes, not counted into the Ledger</p>
                                </Link>
                            )}

                            {/* Achievements Card */}
                            <Link
                                href="/achievements"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-100 rounded-full">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Achievements</h2>
                                <p className="text-gray-600">View personal and club achievements</p>
                            </Link>

                            {/* Tools Card - Admin/Superuser */}
                            {canManage && (
                                <Link
                                    href="/tools"
                                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 bg-orange-100 rounded-full">
                                            <svg className="w-8 h-8 text-orange-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                                            </svg>
                                        </div>
                                        <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Tools</h2>
                                    <p className="text-gray-600">Admin utilities (time calculator, ...)</p>
                                </Link>
                            )}

                            {/* Add Member Card - Admin/Superuser only - LAST */}
                            <Link
                                href="/members/create"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-dashed border-gray-300 hover:border-blue-500"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-indigo-100 rounded-full">
                                        <svg className="w-8 h-8 text-indigo-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Member</h2>
                                <p className="text-gray-600">Register a new club member</p>
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* My Profile Card - Regular users */}
                            <Link
                                href="/my-profile"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 rounded-full">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">My Profile</h2>
                                <p className="text-gray-600">View your member information</p>
                            </Link>

                            {/* Attendance Card - Regular users */}
                            <Link
                                href="/attendance"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-green-100 rounded-full">
                                        <svg className="w-8 h-8 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance</h2>
                                <p className="text-gray-600">View attendance records</p>
                            </Link>

                            {/* My Payments Card - Regular users */}
                            <Link
                                href="/my-payments"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-yellow-100 rounded-full">
                                        <svg className="w-8 h-8 text-yellow-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">My Payments</h2>
                                <p className="text-gray-600">View your payment obligations</p>
                            </Link>

                            {/* Achievements Card - Regular users */}
                            <Link
                                href="/achievements"
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-100 rounded-full">
                                        <svg className="w-8 h-8 text-purple-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <svg className="w-6 h-6 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Achievements</h2>
                                <p className="text-gray-600">View personal and club achievements</p>
                            </Link>
                        </>
                    )}
                    </div>
                </div>

                {/* Footer - Only on Home page, aligned to bottom */}
                <div className="mt-auto pt-8 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Made by Zoran Trandafilovic</span>
                        <span>Version {appVersion}</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
