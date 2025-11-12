export default function isImageFile(file) {
    if (!file) return false;

    // MIME (most reliable if provided)
    const mime = (file.content_type || file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return true; // e.g., "image/png"
    // Some services mislabel images as octet-stream; fall through if so.

    // data: URL (base64 inline)
    const url = file.url || file.path || '';
    if (typeof url === 'string' && url.startsWith('data:image/')) return true;

    // Extension check (strip query/fragment, pick last segment)
    const name = file.original_filename || file.path || file.url || '';
    const ext = getFileExtension(name);
    if (ext) {
        const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'svg', 'heic', 'heif', 'avif', 'ico', 'cur']);
        if (IMAGE_EXTS.has(ext)) return true;
    }

    // Signature sniffing if you have bytes/base64
    // This helps when MIME & ext are missing/misleading.
    const bytes = file.bytes || file.arrayBuffer || file.buffer;
    const base64 = file.base64;
    if (bytes || base64) {
        /* eslint-disable no-empty */
        try {
            const u8 = toUint8(bytes, base64);
            if (u8) return looksLikeImageBytes(u8);
        } catch (_) {}
    }

    return false;
}

export function getFileExtension(str) {
    if (!str || typeof str !== 'string') return '';
    // Fast path for data URLs
    if (str.startsWith('data:image/')) return 'dataurl';
    // Strip query/fragment
    const clean = str.split('?')[0].split('#')[0];
    // Handle full URLs safely if possible
    try {
        const u = new URL(clean);
        str = u.pathname;
    } catch (_) {
        str = clean;
    }
    const last = str.split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    if (dot <= 0 || dot === last.length - 1) return '';
    return last.slice(dot + 1).toLowerCase();
}

// convert provided bytes/base64 into Uint8Array
export function toUint8(bytes, base64) {
    if (bytes instanceof Uint8Array) return bytes;
    if (bytes && bytes.byteLength != null) return new Uint8Array(bytes);
    if (typeof base64 === 'string') {
        if (base64.startsWith('data:')) base64 = base64.split(',')[1] || '';
        const bin = atob(base64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
    return null;
}

// quick magic-number checks for common formats
export function looksLikeImageBytes(u8) {
    if (u8.length < 12) return false;

    // JPEG: FF D8 FF
    if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return true;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47 && u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a) return true;

    // GIF: "GIF87a"/"GIF89a"
    if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38 && (u8[4] === 0x37 || u8[4] === 0x39) && u8[5] === 0x61) return true;

    // WEBP: "RIFF" .... "WEBP"
    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 && u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50) return true;

    // BMP: "BM"
    if (u8[0] === 0x42 && u8[1] === 0x4d) return true;

    // TIFF: "II*" or "MM*"
    if ((u8[0] === 0x49 && u8[1] === 0x49 && u8[2] === 0x2a && u8[3] === 0x00) || (u8[0] === 0x4d && u8[1] === 0x4d && u8[2] === 0x00 && u8[3] === 0x2a)) return true;

    // HEIC/AVIF (ISOBMFF): "ftyp" box with known brands
    // bytes 4..7: 'ftyp'
    const isFtyp = u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70;
    if (isFtyp) {
        const brand = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]).toLowerCase();
        if (['heic', 'heix', 'mif1', 'hevc', 'avif', 'avis'].includes(brand)) return true;
    }

    // SVG can’t be reliably sniffed with bytes (it’s XML). Rely on MIME/extension.
    return false;
}
