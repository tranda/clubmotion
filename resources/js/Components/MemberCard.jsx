import { useEffect, useState } from 'react';

// Digital member card (portrait, credit-card ratio, one side) shown on a phone.
// All sizes are in `cqw` (percent of card width) so the card scales from a
// small preview to full screen.
//
// Three built-in designs based on motion.rs (teal #30afb8, slate #313b48,
// Montserrat). When the admin uploads a background image, it replaces the
// design's own background/logo and only the member data is drawn over it.

export const DESIGN_LABELS = {
    wave: 'Teal Wave',
    night: 'Night Dragon',
    clean: 'Clean White',
};

// Card proportions: width / height (portrait ID-1 card).
export const CARD_RATIO = 54 / 85.6;

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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2cqw', color, fontSize: '4cqw', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            <span className="mc-pulse" style={{ width: '2.6cqw', height: '2.6cqw', borderRadius: '50%', background: dot }} />
            {text}
        </span>
    );
}

function Photo({ m, round, ring, ink, size = 50 }) {
    const w = `${size}cqw`;
    const h = round ? w : `${size * 1.2}cqw`;
    const initials = (m.name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return (
        <div style={{
            width: w, height: h, flexShrink: 0, overflow: 'hidden',
            borderRadius: round ? '50%' : '4cqw',
            border: `1.2cqw solid ${ring}`,
            background: 'rgba(255,255,255,0.18)',
            boxShadow: '0 2cqw 5cqw rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {m.photoUrl ? (
                <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <span style={{ fontSize: `${size * 0.34}cqw`, fontWeight: 700, color: ink || ring }}>{initials}</span>
            )}
        </div>
    );
}

function Field({ label, value, c, warn }) {
    if (!value) return null;
    return (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '3.2cqw', fontWeight: 600, letterSpacing: '0.4cqw', textTransform: 'uppercase', color: c.label }}>{label}</div>
            <div style={{ fontSize: '5.2cqw', fontWeight: 700, color: warn ? c.warn : c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        </div>
    );
}

function StatusPill({ m, c }) {
    const active = m.isActive;
    const text = !active ? 'Inactive' : (m.status || 'Active member');
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '1.2cqw 4cqw', borderRadius: '20cqw',
            fontSize: '3.6cqw', fontWeight: 700, letterSpacing: '0.3cqw', textTransform: 'uppercase',
            background: active ? c.pillBg : '#dc2626', color: active ? c.pillText : '#fff',
        }}>
            {text}
        </span>
    );
}

function Fields({ m, c, align = 'center' }) {
    const medExpired = m.medicalValidity && m.medicalValidity < todayYmd();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3cqw 5cqw', textAlign: align, width: '100%' }}>
            <Field label="Category" value={m.category} c={c} />
            <Field label="Member since" value={m.memberSince} c={c} />
            <Field label="EDBF ID" value={m.edbfId} c={c} />
            <Field label="Medical until" value={formatDate(m.medicalValidity) || 'Not on file'} c={c} warn={medExpired || !m.medicalValidity} />
        </div>
    );
}

// Long names step down in size so they still fit in two lines.
const nameScale = (name = '') => (name.length > 28 ? 0.6 : name.length > 20 ? 0.8 : 1);

const Name = ({ m, c, size = 8 }) => (
    <div style={{
        flexShrink: 0, textAlign: 'center', width: '100%',
        fontSize: `${size * nameScale(m.name)}cqw`, fontWeight: 800, lineHeight: 1.1, color: c.text, textTransform: 'uppercase',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    }}>
        {m.name}
    </div>
);

const WhiteLogo = ({ h = 13, opacity = 1 }) => (
    <img src={LOGO} alt="Motion Dragon Boat Club" style={{ height: `${h}cqw`, opacity }} />
);

const Label = ({ children, color }) => (
    <span style={{ fontSize: '3.4cqw', fontWeight: 700, letterSpacing: '0.8cqw', textTransform: 'uppercase', color }}>{children}</span>
);

const Number = ({ m, color, size = 7 }) => (
    <div style={{ fontSize: `${size}cqw`, fontWeight: 800, lineHeight: 1, color, letterSpacing: '0.5cqw' }}>{formatMemberNumber(m.memberNumber)}</div>
);

const column = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' };

// --- Design 1: teal gradient with paddle-water waves -----------------------
function Wave({ m, c, custom }) {
    return (
        <>
            {!custom && (
                <svg viewBox="0 0 252 400" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <circle cx="240" cy="10" r="110" fill="rgba(255,255,255,0.07)" />
                    <path d="M0 330 C 50 305, 100 355, 150 335 S 220 310, 252 325 L252 400 L0 400Z" fill="rgba(255,255,255,0.10)" />
                    <path d="M0 355 C 60 335, 120 380, 180 360 S 235 345, 252 352 L252 400 L0 400Z" fill="rgba(255,255,255,0.12)" />
                </svg>
            )}
            <div style={{ ...column, padding: '8cqw 7cqw 7cqw', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2cqw' }}>
                    {custom ? <div style={{ height: '13cqw' }} /> : <WhiteLogo />}
                    <Label color={c.label}>Member card</Label>
                </div>
                <Photo m={m} ring={c.ring} size={46} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5cqw', width: '100%' }}>
                    <Name m={m} c={c} />
                    <Number m={m} color={c.accent} />
                </div>
                <Fields m={m} c={c} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5cqw' }}>
                    <StatusPill m={m} c={c} />
                    <LiveClock color={c.text} dot={c.dot} />
                </div>
            </div>
        </>
    );
}

// --- Design 2: dark slate, teal top edge, big dragon watermark -------------
function Night({ m, c, custom }) {
    return (
        <>
            {!custom && (
                <>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(48,175,184,0.40), transparent 60%)' }} />
                    <img src={LOGO} alt="" style={{ position: 'absolute', left: '-20cqw', bottom: '-8cqw', height: '45cqw', opacity: 0.045 }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '2.5cqw', background: `linear-gradient(90deg, ${TEAL}, ${TEAL_DARK})` }} />
                </>
            )}
            <div style={{ ...column, padding: '8cqw 7cqw 7cqw', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    {custom ? <span /> : <WhiteLogo h={11} />}
                    <Label color={c.label}>Member</Label>
                </div>
                <Photo m={m} round ring={c.ring} size={50} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2cqw', width: '100%' }}>
                    <Label color={c.label}>Member ID</Label>
                    <Number m={m} color={c.accent} size={14} />
                    <div style={{ marginTop: '1cqw', width: '100%' }}><Name m={m} c={c} size={7} /></div>
                </div>
                <Fields m={m} c={c} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5cqw' }}>
                    <StatusPill m={m} c={c} />
                    <LiveClock color={c.label} dot={c.dot} />
                </div>
            </div>
        </>
    );
}

// --- Design 3: white card, teal header band, slate footer ------------------
function Clean({ m, c, custom }) {
    return (
        <div style={column}>
            <div style={{
                position: 'absolute', left: 0, right: 0, top: 0, height: '46cqw',
                background: custom ? 'transparent' : `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
            }} />
            <div style={{ position: 'relative', paddingTop: '8cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2cqw' }}>
                {custom ? <div style={{ height: '12cqw' }} /> : <WhiteLogo h={12} />}
                <Label color={custom ? c.label : 'rgba(255,255,255,0.9)'}>Member card</Label>
            </div>
            <div style={{ position: 'relative', marginTop: '5cqw' }}>
                <Photo m={m} ring={custom ? c.ring : '#fff'} ink={custom ? c.ring : TEAL} size={42} />
            </div>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', padding: '4cqw 7cqw 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5cqw', width: '100%' }}>
                    <Name m={m} c={c} size={7.5} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3cqw' }}>
                        <Number m={m} color={c.accent} size={6.5} />
                        <StatusPill m={m} c={c} />
                    </div>
                </div>
                <Fields m={m} c={c} />
            </div>
            <div style={{
                position: 'relative', width: '100%', marginTop: '4cqw', padding: '3.5cqw 7cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5cqw',
                background: custom ? 'transparent' : SLATE,
            }}>
                {!custom && (
                    <span style={{ fontSize: '3.2cqw', fontWeight: 700, letterSpacing: '0.8cqw', color: TEAL, textTransform: 'uppercase' }}>
                        Pokreni svog zmaja
                    </span>
                )}
                <LiveClock color={custom ? c.text : '#fff'} dot={custom ? c.dot : TEAL} />
            </div>
        </div>
    );
}

const DESIGNS = {
    wave: {
        Component: Wave,
        background: `linear-gradient(160deg, ${TEAL} 0%, ${TEAL_DARK} 55%, #26909a 100%)`,
        colors: { text: '#fff', label: 'rgba(255,255,255,0.78)', accent: SLATE, ring: '#fff', pillBg: '#fff', pillText: TEAL_DARK, dot: '#a7f3d0', warn: '#fde68a' },
    },
    night: {
        Component: Night,
        background: `linear-gradient(170deg, #3a4656 0%, ${SLATE} 50%, #232b35 100%)`,
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
                position: 'relative', width: '100%', aspectRatio: '54 / 85.6', overflow: 'hidden',
                borderRadius: '6cqw', fontFamily: FONT,
                background: custom ? `center / cover no-repeat url("${bgUrl}")` : design.background,
                boxShadow: '0 3cqw 8cqw rgba(15,23,42,0.28)',
                textShadow: custom ? (card.textTone === 'dark' ? '0 0 1.2cqw rgba(255,255,255,0.7)' : '0 0.3cqw 1.2cqw rgba(0,0,0,0.45)') : undefined,
            }}>
                <Component m={member} c={c} custom={custom} />
            </div>
        </div>
    );
}
