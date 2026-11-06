import { useState } from 'react';
import { router } from '@inertiajs/react';
import ConfirmModal from '../ConfirmModal';

// Admin-only card on Tools: lists database migrations not yet run on this
// server and runs them (same as `php artisan migrate`).
export default function DatabaseUpdates({ status }) {
    const [confirm, setConfirm] = useState(false);
    const [running, setRunning] = useState(false);
    const pending = status.pending || [];

    const run = () => {
        setConfirm(false);
        router.post('/tools/migrate', {}, {
            preserveScroll: true,
            onStart: () => setRunning(true),
            onFinish: () => setRunning(false),
        });
    };

    return (
        <div className="bg-white rounded-lg shadow p-4 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Database updates</h2>
                <span className="text-xs text-gray-500">Admins only</span>
            </div>

            {status.error ? (
                <p className="text-sm text-red-700">Could not read the database status: {status.error}</p>
            ) : pending.length === 0 ? (
                <p className="text-sm text-green-700">Database is up to date.</p>
            ) : (
                <>
                    <p className="text-sm text-gray-700 mb-2">
                        {pending.length === 1 ? '1 update is' : `${pending.length} updates are`} waiting to be applied:
                    </p>
                    <ul className="mb-3 text-xs font-mono text-gray-700 bg-gray-50 rounded p-2 space-y-0.5 overflow-x-auto">
                        {pending.map((name) => <li key={name}>{name}</li>)}
                    </ul>
                    <button
                        type="button"
                        onClick={() => setConfirm(true)}
                        disabled={running}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                        {running ? 'Updating…' : 'Run database updates'}
                    </button>
                </>
            )}

            {status.output && (
                <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Last run output</p>
                    <pre className="text-xs bg-gray-900 text-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">{status.output}</pre>
                </div>
            )}

            <ConfirmModal
                open={confirm}
                title="Run database updates?"
                confirmLabel="Run"
                message={<>This applies {pending.length === 1 ? 'the waiting update' : `the ${pending.length} waiting updates`} to the live database. Already applied updates are skipped.</>}
                onConfirm={run}
                onCancel={() => setConfirm(false)}
            />
        </div>
    );
}
