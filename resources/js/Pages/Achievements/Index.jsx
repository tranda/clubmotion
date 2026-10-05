import { useState, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function AchievementsIndex({ myAchievementsByEvent, clubAchievementsByEvent, myAchievementKeys, achievementYears = [] }) {
    const { auth } = usePage().props;
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';

    // Toggle between "my" and "club" view
    const [view, setView] = useState('my'); // 'my' or 'club'

    // Export dialog: year range, defaults to the latest year with achievements
    const latestYear = achievementYears[0] || new Date().getFullYear();
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportParams, setExportParams] = useState({ from: latestYear, to: latestYear, format: 'xlsx' });

    const handleExport = (e) => {
        e.preventDefault();
        const params = new URLSearchParams({
            from: exportParams.from,
            to: exportParams.to,
            format: exportParams.format,
        });
        window.location.href = `/achievements/export?${params.toString()}`;
        setShowExportModal(false);
    };

    const getMedalColor = (medal) => {
        switch (medal) {
            case 'GOLD':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'SILVER':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'BRONZE':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    const getMedalIcon = (medal) => {
        switch (medal) {
            case 'GOLD':
                return '🥇';
            case 'SILVER':
                return '🥈';
            case 'BRONZE':
                return '🥉';
            default:
                return '🏅';
        }
    };

    // Delete all achievements for an event (admin/superuser)
    const handleDeleteEvent = (eventName) => {
        if (!confirm(`Delete ALL achievements for "${eventName}"? This removes every member's records for this event and cannot be undone.`)) {
            return;
        }
        router.delete(`/achievements/event?event=${encodeURIComponent(eventName)}`, {
            preserveScroll: true,
        });
    };

    // Check if user has won this achievement
    const hasWonAchievement = (achievement) => {
        const key = `${achievement.event_name}|${achievement.competition_class}|${achievement.medal}`;
        return myAchievementKeys.includes(key);
    };

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

    // Current achievements to display
    const achievementsByEvent = view === 'my' ? myAchievementsByEvent : clubAchievementsByEvent;

    return (
        <Layout>
            <div className="py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
                        <p className="text-gray-600 mt-1">
                            {view === 'my' ? 'Track your personal achievements and milestones' : 'All unique achievements earned by club members'}
                        </p>
                    </div>
                    {canManage && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                            >
                                📤 Export
                            </button>
                            <Link
                                href="/achievements/pull"
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Pull from dbcrews
                            </Link>
                            <Link
                                href="/achievements/import"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Import
                            </Link>
                        </div>
                    )}
                </div>

                {/* Toggle Buttons */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setView('my')}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                            view === 'my'
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        My Achievements
                    </button>
                    <button
                        onClick={() => setView('club')}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                            view === 'club'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        Club Achievements
                    </button>
                </div>

                {/* Achievements Display */}
                {Object.keys(achievementsByEvent).length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements Yet</h3>
                            <p className="text-gray-600">
                                {view === 'my' ? 'Your achievements will appear here once they are added' : 'Club achievements will appear here once they are added'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(achievementsByEvent).map(([eventName, achievements]) => (
                            <div key={eventName} className="bg-white rounded-lg shadow p-4">
                                {/* Event Name Header */}
                                <div className="mb-4 pb-2 border-b border-gray-200 flex items-center justify-between gap-3">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {eventName}
                                        {achievements[0]?.year && (
                                            <span className="ml-2 text-sm font-normal text-gray-600">({achievements[0].year})</span>
                                        )}
                                    </h2>
                                    {canManage && view === 'club' && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteEvent(eventName)}
                                            className="inline-flex items-center shrink-0 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete event
                                        </button>
                                    )}
                                </div>

                                {/* Achievements List */}
                                <div className="space-y-2">
                                    {achievements.map((achievement, idx) => {
                                        const iWonThis = view === 'club' && hasWonAchievement(achievement);

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                                    iWonThis
                                                        ? 'bg-green-50 border-2 border-green-300'
                                                        : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    {iWonThis && (
                                                        <span className="text-green-600 font-bold text-lg">✓</span>
                                                    )}
                                                    <p className="text-gray-900 font-medium">{achievement.competition_class}</p>
                                                </div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getMedalColor(achievement.medal)}`}>
                                                    <span className="text-lg">{getMedalIcon(achievement.medal)}</span>
                                                    <span className="font-semibold text-sm">{achievement.medal}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

                {showExportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Achievements</h2>
                            <form onSubmit={handleExport}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">From year</label>
                                            <select
                                                value={exportParams.from}
                                                onChange={(e) => {
                                                    const from = Number(e.target.value);
                                                    setExportParams({ ...exportParams, from, to: Math.max(from, exportParams.to) });
                                                }}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            >
                                                {achievementYears.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">To year</label>
                                            <select
                                                value={exportParams.to}
                                                onChange={(e) => {
                                                    const to = Number(e.target.value);
                                                    setExportParams({ ...exportParams, to, from: Math.min(to, exportParams.from) });
                                                }}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            >
                                                {achievementYears.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                                        <div className="flex gap-4">
                                            {['xlsx', 'csv', 'pdf'].map((f) => (
                                                <label key={f} className="flex items-center gap-2 text-sm">
                                                    <input
                                                        type="radio"
                                                        name="achievements_export_format"
                                                        value={f}
                                                        checked={exportParams.format === f}
                                                        onChange={() => setExportParams({ ...exportParams, format: f })}
                                                    />
                                                    {f.toUpperCase()}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Exports all club achievements in the selected years.
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="submit"
                                        disabled={achievementYears.length === 0}
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowExportModal(false)}
                                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </Layout>
    );
}
