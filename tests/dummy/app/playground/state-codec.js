/**
 * Encode/decode the playground's shareable `state` query parameter.
 *
 * One declared query param carries the whole control state, so `/components/button?state=…` and
 * `/embed/button?state=…` restore the same preview. Decoding is defensive by contract: a URL is
 * untrusted input, and a bad one must degrade to documented defaults rather than break the page.
 *
 * Only serializable control values travel. Functions, services, Ember records, File objects and
 * anything else that is not plain JSON is dropped at encode time, so a shared link can never
 * carry a live object graph or a credential.
 */

import { coerce, defaultsFor } from './controls';

/**
 * Values of these shapes are never written into a URL.
 */
function isSerializableValue(value) {
    if (value === null) {
        return true;
    }

    const type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean') {
        return Number.isFinite(value) || type !== 'number';
    }

    if (type === 'function' || type === 'symbol' || type === 'bigint' || type === 'undefined') {
        return false;
    }

    if (Array.isArray(value)) {
        return value.every(isSerializableValue);
    }

    if (type === 'object') {
        // Ember records/services, DOM nodes, Files, Errors, Dates — anything with a prototype other
        // than plain Object is not URL material.
        const proto = Object.getPrototypeOf(value);

        if (proto !== Object.prototype && proto !== null) {
            return false;
        }

        return Object.values(value).every(isSerializableValue);
    }

    return false;
}

/**
 * Encode control values into a compact, URL-safe string. Returns `null` when there is nothing
 * worth encoding, so the query parameter stays absent rather than present-and-empty.
 */
export function encodeState(controls = [], values = {}) {
    const payload = {};

    for (const definition of controls) {
        if (definition.serializable === false) {
            continue;
        }

        const value = values[definition.key];

        if (value === undefined) {
            continue;
        }

        // Only record what actually differs from the documented default; shared URLs stay short
        // and a default that later changes is picked up rather than pinned.
        if (deepEqual(value, definition.default)) {
            continue;
        }

        if (!isSerializableValue(value)) {
            continue;
        }

        payload[definition.key] = value;
    }

    if (Object.keys(payload).length === 0) {
        return null;
    }

    try {
        return toBase64Url(JSON.stringify(payload));
    } catch {
        return null;
    }
}

/**
 * Decode a `state` parameter against a control schema.
 *
 * Always returns `{ values, warnings }`:
 *  - every control gets a value, defaulted when absent, unknown, or invalid;
 *  - unknown keys are ignored and reported;
 *  - malformed encoding falls back to defaults entirely, with one warning.
 * Warnings are surfaced as a non-fatal notice, never thrown.
 */
export function decodeState(controls = [], encoded = null) {
    const values = defaultsFor(controls);
    const warnings = [];

    if (encoded === null || encoded === undefined || encoded === '') {
        return { values, warnings };
    }

    let payload;

    try {
        payload = JSON.parse(fromBase64Url(String(encoded)));
    } catch {
        return { values, warnings: ['The shared state in this URL could not be read; showing defaults.'] };
    }

    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        return { values, warnings: ['The shared state in this URL was not a set of control values; showing defaults.'] };
    }

    const byKey = new Map(controls.map((definition) => [definition.key, definition]));

    for (const [key, raw] of Object.entries(payload)) {
        const definition = byKey.get(key);

        if (!definition) {
            warnings.push(`Ignored unknown control "${key}".`);
            continue;
        }

        if (definition.serializable === false) {
            warnings.push(`Ignored "${key}", which is not shareable.`);
            continue;
        }

        const { value, error } = coerce(definition, raw);

        values[key] = value;

        if (error) {
            warnings.push(`Ignored "${key}": ${error}`);
        }
    }

    return { values, warnings };
}

function deepEqual(a, b) {
    if (a === b) {
        return true;
    }

    if (typeof a !== typeof b || a === null || b === null) {
        return false;
    }

    if (typeof a !== 'object') {
        return false;
    }

    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
}

function toBase64Url(text) {
    // btoa() only accepts latin1, so the string is encoded to UTF-8 bytes first. Doing this by
    // hand with escape/unescape mangles multi-byte characters.
    const bytes = new TextEncoder().encode(String(text));

    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded) {
    const base64 = String(encoded).replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return new TextDecoder().decode(bytes);
}
