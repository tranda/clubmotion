import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '../../Components/Layout';
import MemberCard from '../../Components/MemberCard';

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

function usePortrait() {
    const get = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    const [portrait, setPortrait] = useState(get);
    useEffect(() => {
        const onResize = () => setPortrait(get());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return portrait;
}

export default function MemberCardShow({ member, card, backHref }) {
    const [full, setFull] = useState(false);
    const portrait = usePortrait();
    useWakeLock(!!member);

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

    // Full screen: on a portrait phone, turn the card sideways so it fills the screen.
    const fullStyle = portrait
        ? { width: 'min(92vh, 150vw)', transform: 'rotate(90deg)' }
        : { width: 'min(94vw, 145vh)' };

    return (
        <Layout>
            <Head title="Member card" />
            <div className="max-w-xl mx-auto py-2 sm:py-6">
                {backHref && (
                    <Link href={backHref} className="text-sm text-blue-600 hover:text-blue-800">← Back to member</Link>
                )}
                <button type="button" onClick={() => setFull(true)} className="block w-full mt-3 text-left" aria-label="Show card full screen">
                    <MemberCard member={member} card={card} />
                </button>
                <p className="mt-4 text-center text-sm text-gray-500">
                    Tap the card to show it full screen.
                </p>
            </div>

            {full && (
                <div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
                    onClick={() => setFull(false)}
                >
                    <div style={fullStyle}>
                        <MemberCard member={member} card={card} />
                    </div>
                    <span className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400">Tap to close</span>
                </div>
            )}
        </Layout>
    );
}
