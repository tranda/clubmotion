import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

export default function Layout({ children }) {
    const { auth } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    // Only admin and superuser can manage - if no role, treat as regular user
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="text-xl font-bold text-gray-800">
                            ClubMotion
                        </Link>

                        {/* Desktop Navigation - Hidden on Mobile */}
                        <nav className="hidden md:flex space-x-1">
                            <Link
                                href="/"
                                className="flex items-center px-4 py-2 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Home
                            </Link>

                            {canManage ? (
                                <Link
                                    href="/members"
                                    className="flex items-center px-4 py-2 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Members
                                </Link>
                            ) : (
                                <Link
                                    href="/my-profile"
                                    className="flex items-center px-4 py-2 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    My Profile
                                </Link>
                            )}

                            <Link
                                href={canManage ? '/payments' : '/my-payments'}
                                className="flex items-center px-4 py-2 text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                {canManage ? 'Payments' : 'My Payments'}
                            </Link>
                        </nav>

                        {/* Right Side: User Menu + Hamburger */}
                        <div className="flex items-center gap-2">
                            {/* User Menu - Desktop */}
                            <div className="hidden md:relative md:block">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {auth.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{auth.user?.name}</span>
                                    <svg className="w-4 h-4 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown */}
                                {userMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                                            <div className="px-4 py-3 border-b border-gray-200">
                                                <p className="text-sm font-medium text-gray-900">{auth.user?.name}</p>
                                                <p className="text-xs text-gray-500">{auth.user?.email}</p>
                                                <p className="text-xs text-blue-600 font-medium mt-1 capitalize">{auth.user?.role?.name}</p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Hamburger Button - Visible ONLY on Mobile */}
                            <button
                                onClick={toggleMenu}
                                className="md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Toggle menu"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    {menuOpen ? (
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar Menu */}
            <aside
                className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
                    menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="pt-16 px-4">
                    <nav className="space-y-2">
                        <Link
                            href="/"
                            onClick={closeMenu}
                            className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Home
                        </Link>

                        {canManage ? (
                            <Link
                                href="/members"
                                onClick={closeMenu}
                                className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Members
                            </Link>
                        ) : (
                            <Link
                                href="/my-profile"
                                onClick={closeMenu}
                                className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Profile
                            </Link>
                        )}

                        <Link
                            href={canManage ? '/payments' : '/my-payments'}
                            onClick={closeMenu}
                            className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {canManage ? 'Payments' : 'My Payments'}
                        </Link>

                        {/* Mobile User Info & Logout */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="px-4 py-3 bg-gray-50 rounded-lg mb-3">
                                <p className="text-sm font-medium text-gray-900">{auth.user?.name}</p>
                                <p className="text-xs text-gray-500">{auth.user?.email}</p>
                                <p className="text-xs text-blue-600 font-medium mt-1 capitalize">{auth.user?.role?.name}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 mr-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </nav>
                </div>
            </aside>

            {/* Overlay - Mobile Only */}
            {menuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={closeMenu}
                />
            )}

            {/* Main Content */}
            <main className="pt-20 px-4 pb-20 max-w-7xl mx-auto">
                {children}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-gray-600">
                    <span>Made by Zoran Trandafilovic</span>
                    <span>Version 0.5.1</span>
                </div>
            </footer>
        </div>
    );
}
