/**
 * The playground's control system.
 *
 * A control declares one editable argument of a documented component. Controls are data, not
 * behaviour: the host renders them generically, the state codec serializes them, and the example
 * adapter binds the resulting values to the real addon component.
 *
 * Every control carries: key, label, type, default, and — where the type needs it — the options
 * or bounds used to coerce and validate input. `serializable: false` keeps a value out of the
 * shareable URL; functions, services, records, and files are never serialized.
 */

export const CONTROL_TYPES = ['boolean', 'text', 'number', 'select', 'color', 'date', 'datetime', 'json'];

/**
 * Controls whose values never go into a URL, regardless of what a caller asks for.
 * Structured fixture values are allowed through `json`, but only after they parse.
 */
const NEVER_SERIALIZED = new Set();

/**
 * Build a control. Defaults are explicit so the registry stays terse and the schema stays complete.
 */
export function control(key, type, options = {}) {
    const definition = {
        key,
        type,
        label: options.label ?? humanize(key),
        default: 'default' in options ? options.default : defaultFor(type),
        help: options.help ?? null,
        serializable: options.serializable !== false && !NEVER_SERIALIZED.has(key),
    };

    if (type === 'select') {
        definition.options = (options.options ?? []).map(normalizeOption);
    }

    if (type === 'number') {
        definition.min = options.min ?? null;
        definition.max = options.max ?? null;
        definition.step = options.step ?? 1;
    }

    return definition;
}

function normalizeOption(option) {
    if (option && typeof option === 'object') {
        return { value: option.value, label: option.label ?? String(option.value) };
    }

    // `null` is a legitimate option value — it is how "unset" is offered for optional enums.
    return { value: option, label: option === null ? '(none)' : String(option) };
}

function defaultFor(type) {
    switch (type) {
        case 'boolean':
            return false;
        case 'number':
            return 0;
        case 'json':
            return null;
        default:
            return '';
    }
}

function humanize(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

/**
 * Coerce a raw (usually string, usually from a DOM input or a decoded URL) value into the type the
 * control declares.
 *
 * Always returns `{ value, error }`. On error, `value` falls back to the control's default so the
 * example keeps rendering — an invalid control must never take the preview down.
 */
export function coerce(definition, raw) {
    const fallback = definition.default;

    switch (definition.type) {
        case 'boolean': {
            if (typeof raw === 'boolean') {
                return ok(raw);
            }

            if (raw === 'true' || raw === 'false') {
                return ok(raw === 'true');
            }

            return fail(fallback, 'Expected true or false.');
        }

        case 'number': {
            const n = typeof raw === 'number' ? raw : Number(String(raw).trim());

            if (!Number.isFinite(n)) {
                return fail(fallback, 'Enter a number.');
            }

            if (definition.min !== null && n < definition.min) {
                return fail(fallback, `Must be at least ${definition.min}.`);
            }

            if (definition.max !== null && n > definition.max) {
                return fail(fallback, `Must be at most ${definition.max}.`);
            }

            return ok(n);
        }

        case 'select': {
            const match = definition.options.find((o) => o.value === raw || String(o.value) === String(raw));

            return match ? ok(match.value) : fail(fallback, 'Not one of the allowed options.');
        }

        case 'color': {
            const value = String(raw ?? '');

            return /^#[0-9a-f]{6}$/i.test(value) ? ok(value) : fail(fallback, 'Expected a hex colour such as #3b82f6.');
        }

        case 'date':
        case 'datetime': {
            if (raw === '' || raw === null || raw === undefined) {
                return ok(fallback);
            }

            const value = String(raw);

            return Number.isNaN(new Date(value).getTime()) ? fail(fallback, 'Not a valid date.') : ok(value);
        }

        case 'json': {
            if (raw === null || raw === undefined || raw === '') {
                return ok(fallback);
            }

            if (typeof raw === 'object') {
                return ok(raw);
            }

            try {
                return ok(JSON.parse(String(raw)));
            } catch {
                return fail(fallback, 'Not valid JSON.');
            }
        }

        case 'text':
        default:
            return ok(raw === null || raw === undefined ? '' : String(raw));
    }
}

function ok(value) {
    return { value, error: null };
}

function fail(value, error) {
    return { value, error };
}

/**
 * The documented defaults for a control set — what Reset restores.
 */
export function defaultsFor(controls = []) {
    return controls.reduce((values, definition) => {
        values[definition.key] = definition.default;

        return values;
    }, {});
}

/**
 * Validate a control definition. Used by the registry validation test so a malformed control is a
 * failing test rather than a broken page.
 */
export function validateControl(definition) {
    const problems = [];

    if (!definition || typeof definition !== 'object') {
        return ['control is not an object'];
    }

    if (!definition.key) {
        problems.push('missing key');
    }

    if (!CONTROL_TYPES.includes(definition.type)) {
        problems.push(`unknown type "${definition.type}"`);
    }

    if (!definition.label) {
        problems.push('missing label');
    }

    if (!('default' in definition)) {
        problems.push('missing default');
    }

    if (definition.type === 'select') {
        if (!Array.isArray(definition.options) || definition.options.length === 0) {
            problems.push('select control needs options');
        } else if (!definition.options.some((o) => o.value === definition.default)) {
            problems.push('select default is not among its options');
        }
    }

    if (definition.type === 'number' && definition.min !== null && definition.max !== null && definition.min > definition.max) {
        problems.push('min is greater than max');
    }

    // A default must survive its own coercion, or Reset would produce a validation error.
    if (problems.length === 0) {
        const { error } = coerce(definition, definition.default);

        if (error) {
            problems.push(`default fails its own validation: ${error}`);
        }
    }

    return problems;
}
