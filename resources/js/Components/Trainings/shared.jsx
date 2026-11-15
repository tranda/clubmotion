// Small helpers shared by the Trainings pages.

export const TYPE_LABELS = { water: 'Water', gym: 'Gym' };

// Images shown in the gallery (the browser can display these). Keep in sync with TrainingController.
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
export const isImageMime = (mime) => IMAGE_MIMES.includes(mime);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-11-15" → "Sun 15.11.2026" (read as a local date, no timezone shift).
export function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${DAYS[date.getDay()]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

export function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isToday(iso) {
    return !!iso && iso === todayIso();
}

export function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TypeBadge({ type }) {
    const cls = type === 'gym' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
            {type === 'gym' ? '🏋️' : '🚣'} {TYPE_LABELS[type] || type}
        </span>
    );
}

// YouTube / Vimeo address → embeddable player address; other links → null.
export function videoEmbedUrl(url) {
    let u;
    try { u = new URL(url); } catch { return null; }
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'music.youtube.com') {
        if (u.pathname === '/watch') id = u.searchParams.get('v');
        else {
            const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
            if (m) id = m[1];
        }
    }
    if (id && /^[\w-]{6,20}$/.test(id)) {
        const t = parseInt(u.searchParams.get('t') || u.searchParams.get('start') || '', 10);
        return `https://www.youtube-nocookie.com/embed/${id}${t > 0 ? `?start=${t}` : ''}`;
    }
    if (host === 'vimeo.com') {
        const m = u.pathname.match(/^\/(\d+)/);
        if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    return null;
}

export function linkLabel(link) {
    if (link.label) return link.label;
    try { return new URL(link.url).hostname.replace(/^www\./, ''); } catch { return link.url; }
}
