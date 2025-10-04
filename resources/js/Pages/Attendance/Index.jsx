import { useState, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import axios from 'axios';

export default function AttendanceIndex({ attendanceGrid: initialGrid, sessions, sessionTotals: initialTotals, sessionTypes, year, month, sessionTypeFilter, filter }) {
    const { auth } = usePage().props;
    const canManage = auth.user?.role?.name === 'admin' || auth.user?.role?.name === 'superuser';

    const [selectedYear, setSelectedYear] = useState(year);
    const [selectedMonth, setSelectedMonth] = useState(month);
    const [selectedSessionType, setSelectedSessionType] = useState(sessionTypeFilter);
    const [selectedFilter, setSelectedFilter] = useState(filter);
    const [attendanceGrid, setAttendanceGrid] = useState(initialGrid);
    const [sessionTotals, setSessionTotals] = useState(initialTotals);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [newSession, setNewSession] = useState({
        date: '',
        session_type_id: 1,
        notes: '',
    });

    // Update local state when props change (e.g., filter changes)
    useEffect(() => {
        setAttendanceGrid(initialGrid);
        setSessionTotals(initialTotals);
    }, [initialGrid, initialTotals]);

    // Generate year options (current year ± 2 years)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleAttendanceToggle = (memberId, sessionId, currentValue) => {
        if (!canManage) return;

        const newValue = !currentValue;

        // Optimistically update the UI immediately
        setAttendanceGrid(prevGrid => {
            return prevGrid.map(member => {
                if (member.id === memberId) {
                    const updatedSessions = member.sessions.map(session => {
                        if (session.session_id === sessionId) {
                            return { ...session, present: newValue };
                        }
                        return session;
                    });

                    // Recalculate total
                    const total = updatedSessions.filter(s => s.present).length;

                    return {
                        ...member,
                        sessions: updatedSessions,
                        total: total
                    };
                }
                return member;
            });
        });

        // Update session totals
        setSessionTotals(prevTotals => {
            const currentTotal = prevTotals[sessionId] || 0;
            return {
                ...prevTotals,
                [sessionId]: newValue ? currentTotal + 1 : currentTotal - 1
            };
        });

        // Send to backend using axios (no page reload)
        axios.post('/attendance/mark', {
            records: [{
                member_id: memberId,
                session_id: sessionId,
                present: newValue,
            }]
        }).catch(() => {
            // If error, reload to get correct state from server
            router.reload({ only: ['attendanceGrid', 'sessionTotals'] });
        });
    };

    const handleCreateSession = (e) => {
        e.preventDefault();

        router.post('/attendance/sessions', newSession, {
            onSuccess: () => {
                setShowNewSessionModal(false);
                setNewSession({ date: '', session_type_id: 1, notes: '' });
            }
        });
    };

    const handleDeleteSession = (sessionId) => {
        if (confirm('Are you sure you want to delete this session? All attendance records will be lost.')) {
            router.delete(`/attendance/sessions/${sessionId}`, {
                preserveScroll: true,
            });
        }
    };

    const getSessionTypeColor = (sessionTypeId) => {
        const sessionType = sessionTypes.find(st => st.id === sessionTypeId);
        return sessionType?.color || '#3B82F6';
    };

    return (
        <Layout>
            <div className="py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
                    <p className="text-gray-600 mt-1">Track member attendance for training sessions</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Members</label>
                            <select
                                value={selectedFilter}
                                onChange={(e) => {
                                    const newFilter = e.target.value;
                                    setSelectedFilter(newFilter);
                                    router.get('/attendance', {
                                        year: selectedYear,
                                        month: selectedMonth,
                                        session_type_id: selectedSessionType || undefined,
                                        filter: newFilter,
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="active">Active</option>
                                <option value="all">All</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    const newYear = parseInt(e.target.value);
                                    setSelectedYear(newYear);
                                    router.get('/attendance', {
                                        year: newYear,
                                        month: selectedMonth,
                                        session_type_id: selectedSessionType || undefined,
                                        filter: selectedFilter,
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {yearOptions.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => {
                                    const newMonth = parseInt(e.target.value);
                                    setSelectedMonth(newMonth);
                                    router.get('/attendance', {
                                        year: selectedYear,
                                        month: newMonth,
                                        session_type_id: selectedSessionType || undefined,
                                        filter: selectedFilter,
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                {monthNames.map((name, idx) => (
                                    <option key={idx} value={idx + 1}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                            <select
                                value={selectedSessionType || ''}
                                onChange={(e) => {
                                    const newType = e.target.value ? parseInt(e.target.value) : null;
                                    setSelectedSessionType(newType);
                                    router.get('/attendance', {
                                        year: selectedYear,
                                        month: selectedMonth,
                                        session_type_id: newType || undefined,
                                        filter: selectedFilter,
                                    }, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                {sessionTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        {canManage && (
                            <div>
                                <button
                                    onClick={() => setShowNewSessionModal(true)}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    + Add Session
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Session Type Legend and Import */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">Session Types:</h3>
                        {canManage && (
                            <Link
                                href="/attendance/import"
                                className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                            >
                                📥 Import CSV
                            </Link>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {sessionTypes.map(type => (
                            <div key={type.id} className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: type.color }}
                                />
                                <span className="text-sm text-gray-600">{type.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Attendance Grid */}
                {sessions.length > 0 ? (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Member
                                        </th>
                                        <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ left: '200px' }}>
                                            #
                                        </th>
                                        {sessions.map(session => (
                                            <th
                                                key={session.id}
                                                className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider relative group"
                                                style={{ backgroundColor: getSessionTypeColor(session.session_type_id) }}
                                            >
                                                <div>
                                                    {new Date(session.date).getDate()}
                                                    <br />
                                                    <span className="text-xs opacity-90">
                                                        ({sessionTotals[session.id] || 0})
                                                    </span>
                                                </div>
                                                {canManage && (
                                                    <button
                                                        onClick={() => handleDeleteSession(session.id)}
                                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-opacity"
                                                        title="Delete session"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </th>
                                        ))}
                                        <th className="bg-gray-50 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {attendanceGrid.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50">
                                            <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {member.name}
                                            </td>
                                            <td className="sticky z-10 bg-white px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ left: '200px' }}>
                                                {member.membership_number}
                                            </td>
                                            {member.sessions.map((session, idx) => (
                                                <td key={idx} className="px-4 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={session.present}
                                                        onChange={() => handleAttendanceToggle(member.id, session.session_id, session.present)}
                                                        disabled={!canManage}
                                                        className={`w-5 h-5 rounded ${canManage ? 'cursor-pointer' : 'cursor-not-allowed'} text-blue-600 focus:ring-blue-500`}
                                                    />
                                                </td>
                                            ))}
                                            <td className="bg-gray-50 px-6 py-4 text-center text-sm font-semibold text-gray-900">
                                                {member.total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500">No sessions found for {monthNames[selectedMonth - 1]} {selectedYear}</p>
                        {canManage && (
                            <button
                                onClick={() => setShowNewSessionModal(true)}
                                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Create First Session
                            </button>
                        )}
                    </div>
                )}

                {/* New Session Modal */}
                {showNewSessionModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Session</h2>
                            <form onSubmit={handleCreateSession}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={newSession.date}
                                            onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                                            required
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                                        <select
                                            value={newSession.session_type_id}
                                            onChange={(e) => setNewSession({ ...newSession, session_type_id: parseInt(e.target.value) })}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {sessionTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                        <textarea
                                            value={newSession.notes}
                                            onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                                            rows={3}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewSessionModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Create Session
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
