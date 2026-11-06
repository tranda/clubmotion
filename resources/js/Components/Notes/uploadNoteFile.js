// Uploads one file for a note (pasted image or attachment) to the server.
// Resolves to { id, kind, name, mime, size, url }.
export default async function uploadNoteFile(file, kind) {
    const body = new FormData();
    body.append('file', file);
    body.append('kind', kind);

    // Prefer the XSRF cookie: it always matches the current session. Laravel only
    // looks at it when no X-CSRF-TOKEN header is sent, so send one or the other.
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice(11);
    const response = await fetch('/notes/files', {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(xsrf
                ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) }
                : token ? { 'X-CSRF-TOKEN': token } : {}),
        },
    });

    if (!response.ok) {
        let message = `Upload failed (${response.status}).`;
        if (response.status === 413) {
            message = 'The file is larger than the server allows.';
        } else {
            try {
                const data = await response.json();
                message = data?.errors?.file?.[0] || data?.message || message;
            } catch {
                // Not JSON (e.g. an HTML error page); keep the generic message.
            }
        }
        throw new Error(`${file.name}: ${message}`);
    }

    return response.json();
}

export function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
