import { useState, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function ClubAchievements({ achievementsByEvent }) {
    const { auth } = usePage().props;
    const userRole = auth.user?.role?.name || 'user';
    const canManage = userRole === 'admin' || userRole === 'superuser';

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

    return (
        <Layout>
            <div className="py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Club Achievements</h1>
                        <p className="text-gray-600 mt-1">All unique achievements earned by club members</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/my-achievements"
                            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            My Achievements
                        </Link>
                        {canManage && (
                            <Link
                                href="/achievements/import"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Import
                            </Link>
                        )}
                    </div>
                </div>

                {/* Achievements Display */}
                {Object.keys(achievementsByEvent).length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements Yet</h3>
                            <p className="text-gray-600">Club achievements will appear here once they are added</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(achievementsByEvent).map(([eventName, achievements]) => (
                            <div key={eventName} className="bg-white rounded-lg shadow p-4">
                                {/* Event Name Header */}
                                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                    {eventName}
                                    {achievements[0]?.year && (
                                        <span className="ml-2 text-sm font-normal text-gray-600">({achievements[0].year})</span>
                                    )}
                                </h2>

                                {/* Achievements List */}
                                <div className="space-y-2">
                                    {achievements.map((achievement, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <p className="text-gray-900 font-medium">{achievement.competition_class}</p>
                                            </div>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getMedalColor(achievement.medal)}`}>
                                                <span className="text-lg">{getMedalIcon(achievement.medal)}</span>
                                                <span className="font-semibold text-sm">{achievement.medal}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
