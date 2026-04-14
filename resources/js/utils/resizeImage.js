const MAX_DIMENSION = 1200;
const TARGET_BYTES = 2 * 1024 * 1024;
const MIN_QUALITY = 0.5;

export async function resizeImageIfNeeded(file) {
    if (!file.type.startsWith('image/')) {
        return { file, resized: false };
    }

    const bitmap = await loadBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);

    const needsDownscale = width !== bitmap.width || height !== bitmap.height;
    const needsCompression = file.size > TARGET_BYTES;

    if (!needsDownscale && !needsCompression) {
        return { file, resized: false };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.1);
        blob = await canvasToBlob(canvas, quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    const resizedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });

    return {
        file: resizedFile,
        resized: true,
        originalSize: file.size,
        newSize: resizedFile.size,
    };
}

function loadBitmap(file) {
    if (typeof createImageBitmap === 'function') {
        return createImageBitmap(file);
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

function fitWithin(w, h, max) {
    if (w <= max && h <= max) return { width: w, height: h };
    const scale = Math.min(max / w, max / h);
    return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
            'image/jpeg',
            quality,
        );
    });
}

export function formatBytes(bytes) {
    return bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
        : `${Math.round(bytes / 1024)} KB`;
}
