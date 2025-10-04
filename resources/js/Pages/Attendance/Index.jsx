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

    // Default view mode: calendar for mobile, grid for desktop
    const getDefaultViewMode = () => {
        return window.innerWidth < 768 ? 'calendar' : 'grid';
    };
    const [viewMode, setViewMode] = useState(getDefaultViewMode());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDayModal, setShowDayModal] = useState(false);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
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

    const handleUpdateSession = (sessionId) => {
        router.put(`/attendance/sessions/${sessionId}`, editingSession, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingSession(null);
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

    // Generate calendar days for the selected month
    const generateCalendarDays = () => {
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
        const lastDay = new Date(selectedYear, selectedMonth, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];

        // Add empty cells for days before the month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const daySessions = sessions.filter(s => s.date === dateStr);

            let attendanceCount = 0;
            daySessions.forEach(session => {
                attendanceCount += sessionTotals[session.id] || 0;
            });

            days.push({
                day,
                date: dateStr,
                sessions: daySessions,
                attendanceCount,
                totalMembers: attendanceGrid.length
            });
        }

        return days;
    };

    const handleDayClick = (dayData) => {
        if (dayData && dayData.sessions.length > 0) {
            setSelectedDate(dayData);
            setShowDayModal(true);
        }
    };

    return (
        <Layout>
            <div className="py-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Attendance Tracking</h1>
                        <p className="text-gray-600 mt-1">Track member attendance for training sessions</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white text-blue-600 shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                viewMode === 'calendar'
                                    ? 'bg-white text-blue-600 shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
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

                {/* Grid View */}
                {viewMode === 'grid' && sessions.length > 0 && (
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
                )}

                {viewMode === 'grid' && sessions.length === 0 && (
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

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="grid grid-cols-7 gap-2">
                            {/* Week day headers */}
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                                    {day}
                                </div>
                            ))}

                            {/* Calendar days */}
                            {generateCalendarDays().map((dayData, idx) => {
                                const today = new Date();
                                const isToday = dayData &&
                                    dayData.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(dayData)}
                                        className={`min-h-24 border rounded-lg p-2 ${
                                            dayData
                                                ? dayData.sessions.length > 0
                                                    ? 'bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100'
                                                    : 'bg-gray-50 border-gray-200'
                                                : 'bg-transparent border-transparent'
                                        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        {dayData && (
                                            <>
                                                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                                                    {dayData.day}
                                                </div>
                                            {dayData.sessions.length > 0 && (
                                                <div className="space-y-1">
                                                    <div className="flex gap-1 mb-1">
                                                        {dayData.sessions.map(session => (
                                                            <div
                                                                key={session.id}
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: getSessionTypeColor(session.session_type_id) }}
                                                                title={sessionTypes.find(t => t.id === session.session_type_id)?.name}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        {dayData.attendanceCount}/{dayData.totalMembers}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                );
                            })}
                        </div>
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

                {/* Day Detail Modal */}
                {showDayModal && selectedDate && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {new Date(selectedDate.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {selectedDate.sessions.length} session{selectedDate.sessions.length !== 1 ? 's' : ''} • {selectedDate.attendanceCount}/{selectedDate.totalMembers} total attended
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDayModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedDate.sessions.map((session) => {
                                    const sessionType = sessionTypes.find(t => t.id === session.session_type_id);
                                    const attendedCount = sessionTotals[session.id] || 0;

                                    const isEditing = editingSession?.id === session.id;

                                    return (
                                        <div key={session.id} className="mb-6 last:mb-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-4 h-4 rounded-full"
                                                        style={{ backgroundColor: sessionType?.color }}
                                                    />
                                                    {isEditing ? (
                                                        <select
                                                            value={editingSession.session_type_id}
                                                            onChange={(e) => setEditingSession({ ...editingSession, session_type_id: parseInt(e.target.value) })}
                                                            className="text-lg font-semibold border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                        >
                                                            {sessionTypes.map(type => (
                                                                <option key={type.id} value={type.id}>{type.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <h3 className="text-lg font-semibold text-gray-900">{sessionType?.name}</h3>
                                                    )}
                                                    <span className="text-sm text-gray-600">
                                                        {attendedCount}/{selectedDate.totalMembers} attended
                                                    </span>
                                                </div>
                                                {canManage && (
                                                    <div className="flex gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateSession(session.id)}
                                                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingSession(null)}
                                                                    className="text-gray-600 hover:text-gray-700 text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => setEditingSession({ id: session.id, session_type_id: session.session_type_id, notes: session.notes || '' })}
                                                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSession(session.id)}
                                                                    className="text-red-600 hover:text-red-700 text-sm"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <textarea
                                                    value={editingSession.notes}
                                                    onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
                                                    placeholder="Notes (optional)"
                                                    rows={2}
                                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-4"
                                                />
                                            ) : (
                                                session.notes && (
                                                    <p className="text-sm text-gray-600 mb-4 italic">{session.notes}</p>
                                                )
                                            )}

                                            {/* Member List */}
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {attendanceGrid.map(member => {
                                                        const memberSession = member.sessions.find(s => s.session_id === session.id);
                                                        const isPresent = memberSession?.present || false;

                                                        return (
                                                            <label
                                                                key={member.id}
                                                                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                                                    isPresent ? 'bg-green-100' : 'hover:bg-gray-100'
                                                                } ${!canManage ? 'cursor-default' : ''}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isPresent}
                                                                    onChange={() => handleAttendanceToggle(member.id, session.id, isPresent)}
                                                                    disabled={!canManage}
                                                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                                                />
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {member.membership_number}
                                                                    </span>
                                                                    <span className="text-sm text-gray-700">{member.name}</span>
                                                                    {member.exempt_display && (
                                                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                                            {member.exempt_display}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 bg-gray-50">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowDayModal(false)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
