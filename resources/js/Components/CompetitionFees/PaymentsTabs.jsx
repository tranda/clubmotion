import { Link } from '@inertiajs/react';

// Tabs under the Payments title: Membership Fees | Competition Fees
export default function PaymentsTabs({ active }) {
    const tab = (key, href, label) => (
        <Link
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                active === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
            {label}
        </Link>
    );

    return (
        <div className="flex gap-2 border-b border-gray-200 mb-6">
            {tab('membership', '/payments', 'Membership Fees')}
            {tab('competition', '/payments/competition-fees', 'Competition Fees')}
        </div>
    );
}
