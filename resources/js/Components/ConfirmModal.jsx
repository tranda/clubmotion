/**
 * In-page confirmation modal. Use anywhere we'd otherwise call
 * window.confirm() — mobile Chrome can suppress or off-screen the
 * native dialog, so we need a Tailwind modal that always renders
 * on top of the page.
 *
 * Usage:
 *   const [target, setTarget] = useState(null);
 *   <ConfirmModal
 *       open={!!target}
 *       title="Delete entry?"
 *       message={<>Description: {target?.description}</>}
 *       confirmLabel="Delete"
 *       danger
 *       onConfirm={() => { router.delete(...); setTarget(null); }}
 *       onCancel={() => setTarget(null)}
 *   />
 */
export default function ConfirmModal({
    open,
    title,
    message = null,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    const confirmClass = danger
        ? 'bg-red-600 hover:bg-red-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white';

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold mb-2">{title}</h2>
                {message != null && (
                    <div className="text-sm text-gray-600 mb-4">{message}</div>
                )}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg text-sm ${confirmClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
