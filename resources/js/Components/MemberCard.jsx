import { useEffect, useState } from 'react';

// Digital member card (credit-card ratio, one side). All sizes are in `cqw`
// (percent of card width) so the card scales from a small preview to full screen.
//
// Three built-in designs based on motion.rs (teal #30afb8, slate #313b48,
// Montserrat). When the admin uploads a background image, it replaces the
// design's own background/logo and only the member data is drawn over it.

export const DESIGN_LABELS = {
    wave: 'Teal Wave',
    night: 'Night Dragon',
    clean: 'Clean White',
};

const TEAL = '#30afb8';
const TEAL_DARK = '#1c9ba4';
const SLATE = '#313b48';
const LOGO = '/images/motion-card-logo.png'; // white on transparent
const FONT = "'Montserrat', ui-sans-serif, system-ui, sans-serif";

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(ymd) {
    if (!ymd) return null;
    const [y, m, d] = ymd.split('-');
    return `${d}.${m}.${y}`;
}

function todayYmd() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatMemberNumber(n) {
    if (n === null || n === undefined || n === '') return '—';
    return '#' + String(n).padStart(4, '0');
}

// Ticking date + time, so a screenshot is easy to tell from a live card.
function LiveClock({ color, dot }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const text = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1.2cqw', color, fontSize: '2.5cqw', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            <span className="mc-pulse" style={{ width: '1.6cqw', height: '1.6cqw', borderRadius: '50%', background: dot }} />
            {text}
        </span>
    );
}

function Photo({ m, round, ring, size = 26 }) {
    const w = `${size}cqw`;
    const h = round ? w : `${size * 1.25}cqw`;
    const initials = (m.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return (
        <div style={{
            width: w, height: h, flexShrink: 0, overflow: 'hidden',
            borderRadius: round ? '50%' : '2.2cqw',
            border: `0.7cqw solid ${ring}`,
            background: 'rgba(255,255,255,0.18)',
            boxShadow: '0 1.2cqw 3cqw rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {m.photoUrl ? (
                <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <span style={{ fontSize: `${size * 0.36}cqw`, fontWeight: 700, color: ring }}>{initials}</span>
            )}
        </div>
    );
}

function Field({ label, value, c, warn }) {
    if (!value) return null;
    return (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '2cqw', fontWeight: 600, letterSpacing: '0.25cqw', textTransform: 'uppercase', color: c.label }}>{label}</div>
            <div style={{ fontSize: '3.3cqw', fontWeight: 700, color: warn ? c.warn : c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        </div>
    );
}

function StatusPill({ m, c }) {
    const active = m.isActive;
    const text = !active ? 'Inactive' : (m.status || 'Active member');
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.7cqw 2.2cqw', borderRadius: '10cqw',
            fontSize: '2.3cqw', fontWeight: 700, letterSpacing: '0.2cqw', textTransform: 'uppercase',
            background: active ? c.pillBg : '#dc2626', color: active ? c.pillText : '#fff',
        }}>
            {text}
        </span>
    );
}

function Fields({ m, c }) {
    const medExpired = m.medicalValidity && m.medicalValidity < todayYmd();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6cqw 3cqw' }}>
            <Field label="Category" value={m.category} c={c} />
            <Field label="Member since" value={m.memberSince} c={c} />
            <Field label="EDBF ID" value={m.edbfId} c={c} />
            <Field label="Medical until" value={formatDate(m.medicalValidity) || 'Not on file'} c={c} warn={medExpired || !m.medicalValidity} />
        </div>
    );
}

const Name = ({ m, c, size = 5.2 }) => (
    <div style={{
        flexShrink: 0,
        // Long names step down a size so they still fit in two lines.
        fontSize: `${(m.name || '').length > 22 ? size * 0.82 : size}cqw`, fontWeight: 800, lineHeight: 1.1, color: c.text, textTransform: 'uppercase',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    }}>
        {m.name}
    </div>
);

const WhiteLogo = ({ h = 8.5, opacity = 1 }) => (
    <img src={LOGO} alt="Motion Dragon Boat Club" style={{ height: `${h}cqw`, opacity }} />
);

const Label = ({ children, color }) => (
    <span style={{ fontSize: '2.2cqw', fontWeight: 700, letterSpacing: '0.5cqw', textTransform: 'uppercase', color }}>{children}</span>
);

// --- Design 1: teal gradient with paddle-water waves -----------------------
function Wave({ m, c, custom }) {
    return (
        <>
            {!custom && (
                <svg viewBox="0 0 400 252" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M0 190 C 80 160, 140 220, 220 195 S 340 160, 400 185 L400 252 L0 252Z" fill="rgba(255,255,255,0.10)" />
                    <path d="M0 215 C 90 190, 160 245, 250 220 S 360 200, 400 215 L400 252 L0 252Z" fill="rgba(255,255,255,0.12)" />
                    <circle cx="370" cy="20" r="90" fill="rgba(255,255,255,0.07)" />
                </svg>
            )}
            <div style={{ position: 'absolute', inset: 0, padding: '5cqw 5.5cqw', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {custom ? <span /> : <WhiteLogo />}
                    <Label color={c.label}>Member card</Label>
                </div>
                <div style={{ display: 'flex', gap: '4.5cqw', marginTop: '3.5cqw', flex: 1, minHeight: 0 }}>
                    <Photo m={m} ring={c.ring} size={24} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2cqw' }}>
                        <Name m={m} c={c} />
                        <div style={{ fontSize: '4cqw', fontWeight: 800, color: c.accent, letterSpacing: '0.3cqw' }}>{formatMemberNumber(m.memberNumber)}</div>
                        <Fields m={m} c={c} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusPill m={m} c={c} />
                    <LiveClock color={c.text} dot={c.dot} />
                </div>
            </div>
        </>
    );
}

// --- Design 2: dark slate, teal edge, big dragon watermark -----------------
function Night({ m, c, custom }) {
    return (
        <>
            {!custom && (
                <>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 85% 10%, rgba(48,175,184,0.45), transparent 55%)` }} />
                    <img src={LOGO} alt="" style={{ position: 'absolute', right: '-12cqw', bottom: '-4cqw', height: '40cqw', opacity: 0.07 }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2cqw', background: `linear-gradient(${TEAL}, ${TEAL_DARK})` }} />
                </>
            )}
            <div style={{ position: 'absolute', inset: 0, padding: '5cqw 5.5cqw 5cqw 7.5cqw', display: 'flex', gap: '5cqw', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3cqw' }}>
                    <Photo m={m} round ring={c.ring} size={25} />
                    <StatusPill m={m} c={c} />
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {custom ? <span /> : <WhiteLogo h={7.5} />}
                    </div>
                    <div>
                        <Label color={c.label}>Member ID</Label>
                        <div style={{ fontSize: '9cqw', fontWeight: 800, lineHeight: 1, color: c.accent, letterSpacing: '0.4cqw' }}>{formatMemberNumber(m.memberNumber)}</div>
                        <div style={{ marginTop: '1.5cqw' }}><Name m={m} c={c} size={4.6} /></div>
                    </div>
                    <Fields m={m} c={c} />
                    <LiveClock color={c.label} dot={c.dot} />
                </div>
            </div>
        </>
    );
}

// --- Design 3: white card, teal header band, slate footer ------------------
function Clean({ m, c, custom }) {
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
                height: '14cqw', padding: '0 5.5cqw', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: custom ? 'transparent' : `linear-gradient(90deg, ${TEAL}, ${TEAL_DARK})`,
            }}>
                {custom ? <span /> : <WhiteLogo h={8} />}
                <Label color={custom ? c.label : 'rgba(255,255,255,0.9)'}>Member card</Label>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '3.5cqw 5.5cqw', display: 'flex', gap: '4.5cqw' }}>
                <Photo m={m} ring={custom ? c.ring : TEAL} size={22} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.4cqw' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2cqw' }}>
                        <div style={{ fontSize: '4.2cqw', fontWeight: 800, color: c.accent }}>{formatMemberNumber(m.memberNumber)}</div>
                        <StatusPill m={m} c={c} />
                    </div>
                    <Name m={m} c={c} size={4.8} />
                    <Fields m={m} c={c} />
                </div>
            </div>
            <div style={{
                height: '8cqw', padding: '0 5.5cqw', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: custom ? 'transparent' : SLATE,
            }}>
                <span style={{ fontSize: '2.2cqw', fontWeight: 700, letterSpacing: '0.4cqw', color: custom ? c.label : TEAL, textTransform: 'uppercase' }}>
                    {custom ? '' : 'Pokreni svog zmaja'}
                </span>
                <LiveClock color={custom ? c.text : '#fff'} dot={custom ? c.dot : TEAL} />
            </div>
        </div>
    );
}

const DESIGNS = {
    wave: {
        Component: Wave,
        background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 55%, #26909a 100%)`,
        colors: { text: '#fff', label: 'rgba(255,255,255,0.78)', accent: SLATE, ring: '#fff', pillBg: '#fff', pillText: TEAL_DARK, dot: '#a7f3d0', warn: '#fde68a' },
    },
    night: {
        Component: Night,
        background: `linear-gradient(160deg, #3a4656 0%, ${SLATE} 50%, #232b35 100%)`,
        colors: { text: '#fff', label: '#9fb3c4', accent: TEAL, ring: TEAL, pillBg: TEAL, pillText: '#fff', dot: TEAL, warn: '#fbbf24' },
    },
    clean: {
        Component: Clean,
        background: '#ffffff',
        colors: { text: SLATE, label: '#6b7a89', accent: TEAL_DARK, ring: TEAL, pillBg: '#e0f5f6', pillText: TEAL_DARK, dot: TEAL, warn: '#dc2626' },
    },
};

const CUSTOM_COLORS = {
    light: { text: '#fff', label: 'rgba(255,255,255,0.82)', accent: '#fff', ring: '#fff', pillBg: '#fff', pillText: SLATE, dot: '#4ade80', warn: '#fde68a' },
    dark: { text: '#1f2933', label: '#4b5563', accent: SLATE, ring: SLATE, pillBg: SLATE, pillText: '#fff', dot: '#16a34a', warn: '#b91c1c' },
};

export default function MemberCard({ member, card = {}, backgroundOverride }) {
    const design = DESIGNS[card.design] || DESIGNS.wave;
    const bgUrl = backgroundOverride !== undefined ? backgroundOverride : card.backgroundUrl;
    const custom = !!bgUrl;
    const c = custom ? CUSTOM_COLORS[card.textTone === 'dark' ? 'dark' : 'light'] : design.colors;
    const { Component } = design;

    return (
        <div style={{ containerType: 'inline-size', width: '100%' }}>
            <div style={{
                position: 'relative', width: '100%', aspectRatio: '85.6 / 54', overflow: 'hidden',
                borderRadius: '4.5cqw', fontFamily: FONT,
                background: custom ? `center / cover no-repeat url("${bgUrl}")` : design.background,
                boxShadow: '0 2cqw 6cqw rgba(15,23,42,0.28)',
                textShadow: custom ? (card.textTone === 'dark' ? '0 0 0.8cqw rgba(255,255,255,0.7)' : '0 0.2cqw 0.8cqw rgba(0,0,0,0.45)') : undefined,
            }}>
                <Component m={member} c={c} custom={custom} />
            </div>
        </div>
    );
}
