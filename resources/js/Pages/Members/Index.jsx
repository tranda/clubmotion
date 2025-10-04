import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Layout from '../../Components/Layout';

export default function Index({ members, filter, categoryStats }) {
    const [viewMode, setViewMode] = useState('list');
    const handleFilterChange = (e) => {
        const value = e.target.value;
        router.get('/members', { filter: value }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const navigateToMember = (id) => {
        router.visit(`/members/${id}`);
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
            <div className="py-4">
                {/* Header with Filter */}
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Members</h1>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label htmlFor="filter" className="text-sm text-gray-600">Show:</label>
                        <select
                            id="filter"
                            value={filter === undefined || filter === null ? 'active' : filter}
                            onChange={handleFilterChange}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                        </select>
                    </div>
                </div>

                {/* View Toggle and Add Member Button */}
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                viewMode === 'list'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('stats')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                viewMode === 'stats'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Stats
                        </button>
                    </div>

                    {/* Add Member Button */}
                    {viewMode === 'list' && (
                        <Link
                            href="/members/create"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Member
                        </Link>
                    )}
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Desktop Table View (hidden on mobile) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {members.map((member, index) => (
                                    <tr
                                        key={member.id}
                                        onClick={() => navigateToMember(member.id)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.membership_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {member.image ? (
                                                <img
                                                    src={`/storage/${member.image}`}
                                                    alt={member.name}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="text-xs text-gray-500">No pic</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.date_of_birth}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {member.category?.category_name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {member.is_active ? '✅' : '❌'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View (visible on mobile only) */}
                    <div className="md:hidden divide-y divide-gray-200">
                        {members.map((member, index) => (
                            <div
                                key={member.id}
                                onClick={() => navigateToMember(member.id)}
                                className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Member Image */}
                                    <div className="flex-shrink-0">
                                        {member.image ? (
                                            <img
                                                src={`/storage/${member.image}`}
                                                alt={member.name}
                                                className="h-16 w-16 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Member Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-gray-900 truncate">{member.name}</h3>
                                            <span className="ml-2">{member.is_active ? '✅' : '❌'}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">ID: {member.membership_number}</p>
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                        <p className="text-sm text-gray-500">{member.phone}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {member.category?.category_name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {members.length === 0 && (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by adding a new member.</p>
                        </div>
                    )}
                </div>
                )}

                {/* Stats View */}
                {viewMode === 'stats' && categoryStats && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Members by Category</h3>
                        <div className="relative">
                            {(() => {
                                console.log('Category stats:', categoryStats);
                                const maxCount = Math.max(...categoryStats.map(c => c.count));
                                const chartHeight = 300;

                                return (
                                    <div>
                                        <div className="flex items-end justify-between gap-2" style={{ height: `${chartHeight}px` }}>
                                            {categoryStats.map((category, idx) => {
                                                const barHeight = maxCount > 0 ? (category.count / maxCount) * (chartHeight - 40) : 0;
                                                const colors = [
                                                    'bg-blue-500',
                                                    'bg-green-500',
                                                    'bg-purple-500',
                                                    'bg-orange-500',
                                                    'bg-pink-500',
                                                    'bg-indigo-500',
                                                    'bg-teal-500',
                                                    'bg-red-500'
                                                ];
                                                const color = colors[idx % colors.length];

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                                                        {/* Count on top */}
                                                        <div className="text-sm font-semibold text-gray-700 mb-1">
                                                            {category.count}
                                                        </div>
                                                        {/* Bar */}
                                                        <div
                                                            className={`w-full rounded-t-lg transition-all hover:opacity-80 ${color}`}
                                                            style={{ height: `${barHeight}px`, minHeight: category.count > 0 ? '20px' : '0' }}
                                                            title={`${category.name}: ${category.count} members`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Category names on X-axis */}
                                        <div className="flex justify-between gap-2 mt-3">
                                            {categoryStats.map((category, idx) => (
                                                <div key={idx} className="flex-1 text-center text-sm font-medium text-gray-900">
                                                    {category.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="mt-6 text-sm text-gray-500 text-center">
                            Distribution of {filter === 'active' ? 'active' : 'all'} members across categories
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
