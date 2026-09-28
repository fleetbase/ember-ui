/**
 * Turn whatever a component hands a callback into something safe to display in the event log.
 *
 * Component callbacks receive DOM events, Ember records, services, Files, Errors and occasionally
 * cyclic structures. The log shows a short, readable summary of each; it never renders a live
 * object graph, never walks an Ember record's relationships, and never throws — a callback that
 * cannot be summarized must not take the page down.
 */

const MAX_DEPTH = 3;
const MAX_ARRAY = 10;
const MAX_KEYS = 12;
const MAX_STRING = 120;

/**
 * DOM event fields that are safe and actually useful to show. Anything else on the event
 * (including `target` itself) is deliberately not read.
 */
const DOM_EVENT_FIELDS = ['type', 'key', 'code', 'button', 'clientX', 'clientY', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'];

export function summarizeArguments(args = []) {
    return Array.from(args).map((arg) => summarize(arg));
}

export function summarize(value, depth = 0, seen = new WeakSet()) {
    try {
        return summarizeUnsafe(value, depth, seen);
    } catch {
        return { kind: 'unavailable', text: '(could not be summarized)' };
    }
}

function summarizeUnsafe(value, depth, seen) {
    if (value === null) {
        return { kind: 'null', text: 'null' };
    }

    if (value === undefined) {
        return { kind: 'undefined', text: 'undefined' };
    }

    const type = typeof value;

    if (type === 'string') {
        return { kind: 'string', text: truncate(JSON.stringify(value)) };
    }

    if (type === 'number' || type === 'boolean' || type === 'bigint') {
        return { kind: type, text: String(value) };
    }

    if (type === 'symbol') {
        return { kind: 'symbol', text: String(value) };
    }

    if (type === 'function') {
        return { kind: 'function', text: `function ${value.name || '(anonymous)'}()` };
    }

    // ---- specific object shapes, most-specific first -------------------------------------------

    if (isDomEvent(value)) {
        return { kind: 'event', text: `${value.type} event`, fields: domEventFields(value) };
    }

    if (isDomNode(value)) {
        return { kind: 'node', text: describeNode(value) };
    }

    if (isFile(value)) {
        // Name, type and size only — never the contents.
        return { kind: 'file', text: `File ${JSON.stringify(value.name)}`, fields: { type: value.type || 'unknown', size: `${value.size} bytes` } };
    }

    if (value instanceof Error) {
        return { kind: 'error', text: `${value.name}: ${truncate(value.message)}` };
    }

    if (value instanceof Date) {
        return { kind: 'date', text: Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString() };
    }

    if (isEmberRecord(value)) {
        // Identity only. Reading a record's attributes here would pull in relationships and
        // potentially real data; the log is not a data browser.
        return { kind: 'record', text: `${value.constructor?.modelName ?? 'record'}:${value.id ?? '(unsaved)'}` };
    }

    if (isEmberService(value)) {
        return { kind: 'service', text: '(service)' };
    }

    if (seen.has(value)) {
        return { kind: 'cycle', text: '(circular)' };
    }

    if (depth >= MAX_DEPTH) {
        return { kind: 'deep', text: Array.isArray(value) ? `Array(${value.length})` : '{…}' };
    }

    seen.add(value);

    try {
        if (Array.isArray(value)) {
            const items = value.slice(0, MAX_ARRAY).map((item) => summarize(item, depth + 1, seen));
            const text = `Array(${value.length})`;

            return value.length > MAX_ARRAY ? { kind: 'array', text, items, truncated: value.length - MAX_ARRAY } : { kind: 'array', text, items };
        }

        return summarizePlainObject(value, depth, seen);
    } finally {
        seen.delete(value);
    }
}

function summarizePlainObject(value, depth, seen) {
    const keys = Object.keys(value).slice(0, MAX_KEYS);
    const fields = {};

    for (const key of keys) {
        const child = summarize(value[key], depth + 1, seen);

        fields[key] = child.text;
    }

    const total = Object.keys(value).length;
    const label = value.constructor && value.constructor.name && value.constructor.name !== 'Object' ? value.constructor.name : '';

    return {
        kind: 'object',
        text: label ? `${label} {…}` : '{…}',
        fields,
        ...(total > MAX_KEYS ? { truncated: total - MAX_KEYS } : {}),
    };
}

function domEventFields(event) {
    const fields = {};

    for (const key of DOM_EVENT_FIELDS) {
        const raw = event[key];

        if (raw !== undefined && raw !== null && raw !== false && raw !== '') {
            fields[key] = String(raw);
        }
    }

    // The two bits of target state that make an input event legible, and nothing else off target.
    const target = event.target;

    if (target && typeof target === 'object') {
        if (typeof target.value === 'string') {
            fields['target.value'] = truncate(target.value);
        }

        if (typeof target.checked === 'boolean') {
            fields['target.checked'] = String(target.checked);
        }

        if (typeof target.tagName === 'string') {
            fields['target'] = target.tagName.toLowerCase();
        }
    }

    return fields;
}

function describeNode(node) {
    const tag = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : 'node';

    return `<${tag}>`;
}

function isDomEvent(value) {
    return typeof Event !== 'undefined' && value instanceof Event;
}

function isDomNode(value) {
    return typeof Node !== 'undefined' && value instanceof Node;
}

function isFile(value) {
    return typeof File !== 'undefined' && value instanceof File;
}

function isEmberRecord(value) {
    // ember-data records expose these; checking shape avoids importing ember-data here.
    return typeof value === 'object' && value !== null && 'isDestroyed' in value && ('currentState' in value || typeof value.constructor?.modelName === 'string');
}

function isEmberService(value) {
    return typeof value === 'object' && value !== null && value.isServiceFactory === true;
}

function truncate(text) {
    const value = String(text);

    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
}
