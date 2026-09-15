import { get } from '@ember/object';
import ObjectProxy from '@ember/object/proxy';
import { getResourceDescriptor, readDescriptor, safeIdentifier, resourceComponentName, relationValue } from './resource-registry';
import formatBytes from './format-bytes';
import smartHumanize from './smart-humanize';

/**
 * Shared presentation logic for the resource identity components: everything
 * a pill, summary, identity cell or select-option derives from a descriptor
 * and a record, with plain-attribute fallbacks when there is no descriptor.
 */

export const DEFAULT_STATUS_TONES = {
    active: 'text-green-500',
    available: 'text-green-500',
    online: 'text-green-500',
    connected: 'text-green-500',
    success: 'text-green-500',
    enabled: 'text-green-500',
    equipped: 'text-green-500',
    in_stock: 'text-green-500',
    in_service: 'text-green-500',
    on_duty: 'text-green-500',
    published: 'text-green-500',
    passed: 'text-green-500',
    completed: 'text-green-500',
    matched: 'text-green-500',
    warning: 'text-yellow-500',
    pending: 'text-yellow-500',
    busy: 'text-yellow-500',
    assigned: 'text-yellow-500',
    maintenance: 'text-yellow-500',
    recently_offline: 'text-yellow-500',
    low_stock: 'text-yellow-500',
    in_progress: 'text-yellow-500',
    scheduled: 'text-yellow-500',
    draft: 'text-yellow-500',
    medium: 'text-yellow-500',
    inactive: 'text-gray-400',
    offline: 'text-gray-400',
    unavailable: 'text-gray-400',
    unequipped: 'text-gray-400',
    never_connected: 'text-gray-400',
    long_offline: 'text-gray-400',
    detached: 'text-gray-400',
    low: 'text-gray-400',
    out_of_stock: 'text-red-500',
    error: 'text-red-500',
    disabled: 'text-red-500',
    suspended: 'text-red-500',
    out_of_service: 'text-red-500',
    failed: 'text-red-500',
    overdue: 'text-red-500',
    expired: 'text-red-500',
    critical: 'text-red-500',
    high: 'text-red-500',
    urgent: 'text-red-500',
    canceled: 'text-red-500',
    cancelled: 'text-red-500',
    retired: 'text-red-500',
};

const TITLE_PATHS = ['name', 'display_name', 'displayName', 'title', 'tracking', 'public_id'];

/** A record with any proxy peeled off; never a promise. */
export function unwrapRecord(value) {
    if (!value || typeof value !== 'object') {
        return value ?? null;
    }

    if (value instanceof ObjectProxy) {
        return value.content ?? null;
    }

    if (typeof value.then === 'function' && 'content' in value) {
        return value.content ?? null;
    }

    return value;
}

function firstPresent(record, paths) {
    for (const path of paths) {
        const value = get(record, path);

        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }

    return undefined;
}

export function resourceTitle(descriptor, record, fallback) {
    if (!record) {
        return fallback ?? null;
    }

    const title = readDescriptor(descriptor, 'title', record);

    if (title !== undefined && title !== null && String(title).trim() !== '') {
        return title;
    }

    return firstPresent(record, TITLE_PATHS) ?? fallback ?? null;
}

export function resourceIdentifier(descriptor, record) {
    if (!record) {
        return null;
    }

    return safeIdentifier(readDescriptor(descriptor, 'identifier', record));
}

/**
 * Normalizes what a descriptor's `image()` returns into
 * `{ url, fallback, shape, icon, component }`.
 */
export function resourceImage(descriptor, record, overrides = {}) {
    const raw = record ? readDescriptor(descriptor, 'image', record) : undefined;
    const image = raw && typeof raw === 'object' ? raw : {};
    const url = overrides.url ?? image.url ?? (typeof raw === 'string' ? raw : undefined) ?? (record ? firstPresent(record, ['photo_url', 'avatar_url', 'logo_url', 'icon_url']) : undefined);

    return {
        url: url ?? null,
        fallback: overrides.fallback ?? image.fallback ?? null,
        shape: overrides.shape ?? image.shape ?? 'round',
        icon: overrides.icon ?? image.icon ?? null,
        iconClass: image.iconClass ?? null,
        component: image.component ?? null,
    };
}

export function resourceOnline(descriptor, record) {
    if (!record) {
        return undefined;
    }

    const online = readDescriptor(descriptor, 'online', record);

    if (online === undefined && !descriptor) {
        const value = get(record, 'online') ?? get(record, 'is_online');

        return typeof value === 'boolean' ? value : undefined;
    }

    return online ?? undefined;
}

export function resourceStatus(descriptor, record) {
    if (!record) {
        return undefined;
    }

    const status = readDescriptor(descriptor, 'status', record);

    if (status === undefined && !descriptor) {
        return get(record, 'status') ?? undefined;
    }

    return status ?? undefined;
}

/** The dot colour class for an online flag or status value. */
export function statusToneClass(value, tones = {}) {
    if (typeof value === 'boolean') {
        return value ? 'text-green-500' : 'text-yellow-200';
    }

    if (value === undefined || value === null || value === '') {
        return 'text-gray-400';
    }

    const map = { ...DEFAULT_STATUS_TONES, ...tones };
    const key = String(value);

    return map[key] ?? map[key.toLowerCase()] ?? 'text-gray-400';
}

/** Badges from a descriptor, minus any that point back at the row itself. */
export function resourceBadges(descriptor, record, context = {}) {
    if (!record) {
        return [];
    }

    const badges = readDescriptor(descriptor, 'badges', record, context);
    const list = Array.isArray(badges) ? badges : [];
    const selfId = context.selfId ?? null;

    return list.filter((badge) => badge && badge.label !== undefined && badge.label !== null && String(badge.label).trim() !== '' && !(selfId && badge.relatedId && String(badge.relatedId) === String(selfId)));
}

export function formatFactValue(value, format) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof format === 'function') {
        try {
            return format(value);
        } catch {
            return null;
        }
    }

    if (format === 'date' || value instanceof Date) {
        const date = value instanceof Date ? value : new Date(value);

        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }

    if (format === 'bytes') {
        return formatBytes(Number(value));
    }

    if (format === 'humanize') {
        return smartHumanize(String(value));
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return String(value);
}

function humanizeKey(key) {
    const last = String(key).split('.').pop();

    return smartHumanize(last.replace(/[-_]/g, ' '));
}

/**
 * The facts a summary lists: `[{ label, value, related, relatedType, pillComponent }]`.
 * A fact with a related record renders as that record's pill when the owner
 * can render one, otherwise as its value text.
 */
export function resourceFacts(owner, descriptor, record, { translate, limit = 6 } = {}) {
    if (!record) {
        return [];
    }

    const facts = readDescriptor(descriptor, 'facts', record);
    const list = Array.isArray(facts) ? facts : [];
    const output = [];

    for (const fact of list) {
        if (!fact) {
            continue;
        }

        const related = unwrapRecord(fact.related);
        const pillComponent = related ? resourceComponentName(owner, 'pill', fact.relatedType ?? related) : null;
        const value = related && !pillComponent ? resourceTitle(getResourceDescriptor(owner, fact.relatedType ?? related), related, fact.value) : formatFactValue(fact.value, fact.format);

        if ((value === null || value === undefined || value === '') && !pillComponent) {
            continue;
        }

        const label = fact.label ?? (fact.labelKey ? (typeof translate === 'function' ? translate(fact.labelKey) : null) : null) ?? humanizeKey(fact.labelKey ?? 'value');

        output.push({ label, value, related, relatedType: fact.relatedType ?? null, pillComponent });

        if (output.length >= limit) {
            break;
        }
    }

    return output;
}

/** The detail strings a select-option shows under the title. */
export function resourceSelectDetails(descriptor, record) {
    if (!record) {
        return [];
    }

    const details = readDescriptor(descriptor, 'selectDetails', record);

    if (Array.isArray(details)) {
        return details;
    }

    if (details !== undefined && details !== null) {
        return [details];
    }

    return [resourceIdentifier(descriptor, record)];
}

/** Translates a key through the owner's intl service when it has the key. */
export function makeTranslator(owner) {
    let intl = null;

    try {
        intl = owner?.lookup?.('service:intl') ?? null;
    } catch {
        intl = null;
    }

    return (key) => {
        if (!intl || typeof intl.t !== 'function') {
            return null;
        }

        try {
            if (typeof intl.exists === 'function' && !intl.exists(key)) {
                return null;
            }

            return intl.t(key);
        } catch {
            return null;
        }
    };
}

export { relationValue };
