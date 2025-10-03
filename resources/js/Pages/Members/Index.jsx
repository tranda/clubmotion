import { Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Index({ members, filter }) {
    const handleFilterChange = (e) => {
        const value = e.target.value;
        router.get('/members', value ? { filter: value } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const navigateToMember = (id) => {
        router.visit(`/members/${id}`);
    };

    return (
        <Layout>
            <div className="py-4">
                {/* Header with Filter */}
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Members List</h1>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label htmlFor="filter" className="text-sm text-gray-600">Show:</label>
                        <select
                            id="filter"
                            value={filter || ''}
                            onChange={handleFilterChange}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                        </select>
                    </div>
                </div>

                {/* Add Member Button */}
                <div className="mb-4">
                    <Link
                        href="/members/create"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Member
                    </Link>
                </div>

                {/* Mobile Cards / Desktop Table */}
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
            </div>
        </Layout>
    );
}
