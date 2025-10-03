import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../../Components/Layout';

export default function Edit({ member, categories }) {
    const { data, setData, post, processing, errors } = useForm({
        name: member.name || '',
        membership_number: member.membership_number || '',
        date_of_birth: member.date_of_birth || '',
        address: member.address || '',
        phone: member.phone || '',
        email: member.email || '',
        category_id: member.category_id || '',
        medical_validity: member.medical_validity || '',
        is_active: member.is_active || false,
        image: null,
        _method: 'PUT',
    });

    const [imagePreview, setImagePreview] = useState(
        member.image ? `/storage/${member.image}` : null
    );

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(`/members/${member.id}`);
    };

    return (
        <Layout>
            <div className="py-4">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={`/members/${member.id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Member Details
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Edit Member Details</h1>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Profile Picture
                            </label>
                            <div className="flex flex-col items-center">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="h-32 w-32 rounded-full object-cover mb-4"
                                    />
                                ) : (
                                    <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                                        <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <p className="mt-2 text-xs text-gray-500">Upload a new image to replace the current one</p>
                            </div>
                            {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
                        </div>

                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        {/* Membership Number */}
                        <div>
                            <label htmlFor="membership_number" className="block text-sm font-medium text-gray-700 mb-2">
                                Membership ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="membership_number"
                                value={data.membership_number}
                                onChange={(e) => setData('membership_number', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            {errors.membership_number && <p className="mt-1 text-sm text-red-600">{errors.membership_number}</p>}
                        </div>

                        {/* Date of Birth */}
                        <div>
                            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                id="date_of_birth"
                                value={data.date_of_birth}
                                onChange={(e) => setData('date_of_birth', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth}</p>}
                        </div>

                        {/* Address */}
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                Address
                            </label>
                            <input
                                type="text"
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Phone
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                id="category_id"
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.category_name}
                                    </option>
                                ))}
                            </select>
                            {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
                        </div>

                        {/* Medical Validity */}
                        <div>
                            <label htmlFor="medical_validity" className="block text-sm font-medium text-gray-700 mb-2">
                                Medical Validity
                            </label>
                            <input
                                type="date"
                                id="medical_validity"
                                value={data.medical_validity}
                                onChange={(e) => setData('medical_validity', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {errors.medical_validity && <p className="mt-1 text-sm text-red-600">{errors.medical_validity}</p>}
                        </div>

                        {/* Active Status */}
                        <div>
                            <label htmlFor="is_active" className="block text-sm font-medium text-gray-700 mb-2">
                                Active Status
                            </label>
                            <select
                                id="is_active"
                                value={data.is_active ? '1' : '0'}
                                onChange={(e) => setData('is_active', e.target.value === '1')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Saving...' : 'Save Changes'}
                            </button>
                            <Link
                                href={`/members/${member.id}`}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-center"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
