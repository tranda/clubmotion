import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function RatePresets({ presets }) {
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        start_month: 1,
        end_month: 12,
        rate: '',
    });

    const monthNames = {
        1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
        5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
        9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };

    const monthNamesFull = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_month: 1,
            end_month: 12,
            rate: '',
        });
    };

    const openAddModal = () => {
        resetForm();
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        resetForm();
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        router.post('/payments/presets', formData, {
            onSuccess: () => closeModal(),
        });
    };

    // Inline editing functions
    const startEditing = (preset) => {
        setEditingId(preset.id);
        setEditData({
            name: preset.name,
            start_month: preset.start_month,
            end_month: preset.end_month,
            rate: preset.rate,
            is_active: preset.is_active,
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEditing = () => {
        router.put(`/payments/presets/${editingId}`, editData, {
            onSuccess: () => {
                setEditingId(null);
                setEditData({});
            },
        });
    };

    const handleDelete = (preset) => {
        if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
            router.delete(`/payments/presets/${preset.id}`);
        }
    };

    const toggleActive = (preset) => {
        router.put(`/payments/presets/${preset.id}`, {
            ...preset,
            is_active: !preset.is_active,
        });
    };

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Payment Rate Presets</h1>
                    <div className="flex gap-2">
                        <Link
                            href="/payments/initialize"
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Back to Initialize
                        </Link>
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Preset
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b">
                        <p className="text-gray-600 text-sm">
                            Manage quick-set buttons that appear on the payment initialization page.
                            Click on any row to edit inline.
                        </p>
                    </div>

                    {presets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No presets defined. Click "Add Preset" to create one.
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Start</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">End</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rate (RSD)</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {presets.map((preset) => (
                                    <tr
                                        key={preset.id}
                                        className={`${!preset.is_active ? 'bg-gray-50 opacity-60' : ''} ${editingId === preset.id ? 'bg-blue-50' : ''}`}
                                    >
                                        {editingId === preset.id ? (
                                            <>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={editData.name}
                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        className="w-full px-2 py-1 text-sm border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={editData.start_month}
                                                        onChange={(e) => setEditData({ ...editData, start_month: parseInt(e.target.value) })}
                                                        className="w-full px-2 py-1 text-sm border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        {Object.entries(monthNames).map(([num, name]) => (
                                                            <option key={num} value={num}>{name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={editData.end_month}
                                                        onChange={(e) => setEditData({ ...editData, end_month: parseInt(e.target.value) })}
                                                        className="w-full px-2 py-1 text-sm border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        {Object.entries(monthNames).map(([num, name]) => (
                                                            <option key={num} value={num}>{name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={editData.rate}
                                                        onChange={(e) => setEditData({ ...editData, rate: e.target.value })}
                                                        className="w-24 px-2 py-1 text-sm border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <button
                                                        onClick={() => setEditData({ ...editData, is_active: !editData.is_active })}
                                                        className={`px-2 py-1 text-xs rounded ${
                                                            editData.is_active
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {editData.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        onClick={saveEditing}
                                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 mr-2"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                                                    >
                                                        Cancel
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3 font-medium">{preset.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{monthNames[preset.start_month]}</td>
                                                <td className="px-4 py-3 text-gray-600">{monthNames[preset.end_month]}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {Number(preset.rate).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => toggleActive(preset)}
                                                        className={`px-2 py-1 text-xs rounded ${
                                                            preset.is_active
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {preset.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => startEditing(preset)}
                                                        className="text-blue-600 hover:text-blue-800 mr-3"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(preset)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-semibold">Add New Preset</h2>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Button Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Jan-Mar: 2500"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Month
                                    </label>
                                    <select
                                        value={formData.start_month}
                                        onChange={(e) => setFormData({ ...formData, start_month: parseInt(e.target.value) })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {Object.entries(monthNamesFull).map(([num, name]) => (
                                            <option key={num} value={num}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        End Month
                                    </label>
                                    <select
                                        value={formData.end_month}
                                        onChange={(e) => setFormData({ ...formData, end_month: parseInt(e.target.value) })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {Object.entries(monthNamesFull).map(([num, name]) => (
                                            <option key={num} value={num}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rate (RSD)
                                </label>
                                <input
                                    type="number"
                                    value={formData.rate}
                                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                    placeholder="e.g., 2500"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
