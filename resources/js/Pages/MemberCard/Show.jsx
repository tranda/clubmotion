import { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import MemberCard, { CARD_RATIO } from '../../Components/MemberCard';

// Keep the phone screen on while the card is shown (where supported).
function useWakeLock(enabled) {
    useEffect(() => {
        if (!enabled || !('wakeLock' in navigator)) return;
        let lock = null;
        const request = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
        const onVisible = () => document.visibilityState === 'visible' && request();
        request();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            lock?.release().catch(() => {});
        };
    }, [enabled]);
}

export default function MemberCardShow({ member, card, backHref }) {
    const [full, setFull] = useState(false);
    useWakeLock(!!member);

    // Tapping anywhere outside the card closes it (back to the member, or home).
    const closeCard = () => router.visit(backHref || '/');
    const keepOpen = (e) => e.stopPropagation();

    useEffect(() => {
        if (!full) return;
        const onKey = (e) => e.key === 'Escape' && setFull(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [full]);

    if (!member) {
        return (
            <Layout>
                <Head title="Member card" />
                <div className="max-w-md mx-auto py-10 text-center text-gray-600">
                    No member profile is linked to your account, so there is no card to show.
                </div>
            </Layout>
        );
    }

    // Full screen: as large as fits the screen, keeping the card's proportions.
    const fullStyle = { width: `min(92vw, ${(88 * CARD_RATIO).toFixed(2)}vh)` };

    return (
        <Layout>
            <Head title="Member card" />
            {/* cursor-pointer: iOS Safari ignores taps on plain divs without it. */}
            <div className="min-h-[calc(100vh-6rem)] cursor-pointer" onClick={closeCard}>
                <div className="max-w-sm mx-auto py-2 sm:py-6">
                    {backHref && (
                        <Link href={backHref} onClick={keepOpen} className="text-sm text-blue-600 hover:text-blue-800">← Back to member</Link>
                    )}
                    <button
                        type="button"
                        onClick={(e) => { keepOpen(e); setFull(true); }}
                        className="block w-full mt-3 text-left"
                        aria-label="Show card full screen"
                    >
                        <MemberCard member={member} card={card} />
                    </button>
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Tap the card for full screen, tap outside to close.
                    </p>
                </div>
            </div>

            {full && (
                <div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={closeCard}
                >
                    <div style={fullStyle} className="cursor-default" onClick={keepOpen}>
                        <MemberCard member={member} card={card} />
                    </div>
                    <span className="absolute left-0 right-0 text-center text-xs text-gray-400" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>Tap outside the card to close</span>
                </div>
            )}
        </Layout>
    );
}
