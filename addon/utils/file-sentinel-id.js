/**
 * The file uuid inside a `file:<uuid>` custom field value, or null for any other value.
 *
 * File-backed custom fields store a reference to the file, and the server expands it into
 * the file's json on read. A record edited in this session still carries the reference
 * locally until the store is reloaded, so the components resolve it themselves.
 *
 * @param {*} value
 * @returns {string|null}
 */
export default function fileSentinelId(value) {
    return typeof value === 'string' && value.startsWith('file:') && value.length > 5 ? value.slice(5) : null;
}
