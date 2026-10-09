// Shared formatting for the Competition Fees pages.

export const formatMoney = (amount, currency) =>
    `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

// 2026-10-05 -> 05.10.2026
export const formatDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
};

export const todayIso = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const METHOD_LABELS = { cash: 'Cash', bank_transfer: 'Bank transfer', other: 'Other' };

const STATUS_STYLES = {
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    unpaid: 'bg-red-100 text-red-800',
    exempt: 'bg-gray-100 text-gray-600',
    overpaid: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-400 line-through',
};

const COMPETITION_STATUS_STYLES = {
    planned: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-gray-200 text-gray-700',
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || ''}`}>
            {capitalize(status)}
        </span>
    );
}

export function CompetitionStatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COMPETITION_STATUS_STYLES[status] || ''}`}>
            {capitalize(status)}
        </span>
    );
}

export function SummaryCard({ label, value, className = 'text-gray-900' }) {
    return (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
            <div className="text-xs sm:text-sm text-gray-600">{label}</div>
            <div className={`text-lg sm:text-2xl font-bold ${className}`}>{value}</div>
        </div>
    );
}

export function Modal({ title, onClose, children, wide = false }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className={`bg-white rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto ${wide ? 'max-w-2xl' : 'max-w-md'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
                {children}
            </div>
        </div>
    );
}

export const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
