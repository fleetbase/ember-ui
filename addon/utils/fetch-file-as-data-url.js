/**
 * Downloads a stored file through the Fleetbase API and returns it as a data URL.
 *
 * Files live on object storage behind signed URLs that do not answer CORS for the console,
 * so a canvas cannot load them directly: signature_pad sets `crossOrigin` on the image and
 * the load fails. The API's `files/download` endpoint streams the bytes with the console's
 * own CORS and credentials, and a data URL never taints the canvas.
 *
 * @param {Object} fetchService the console's `fetch` service (host, namespace, credentials, getHeaders)
 * @param {string} fileId
 * @returns {Promise<string>} a `data:` URL
 */
export default async function fetchFileAsDataUrl(fetchService, fileId) {
    const base = [fetchService.host, fetchService.namespace, 'files/download'].filter(Boolean).join('/');
    const response = await window.fetch(`${base}?${new URLSearchParams({ file: fileId })}`, {
        method: 'GET',
        mode: 'cors',
        credentials: fetchService.credentials ?? 'include',
        headers: fetchService.getHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Unable to download file ${fileId} (${response.status})`);
    }

    return blobToDataUrl(await response.blob());
}

export function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        /* istanbul ignore next -- FileReader only errors on an unreadable Blob, which fetch never hands back */
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
