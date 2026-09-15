import { get } from '@ember/object';
import { dasherize } from '@ember/string';
import { isArray } from '@ember/array';
import ObjectProxy from '@ember/object/proxy';

/**
 * The resource identity registry.
 *
 * A descriptor teaches the console how to show one kind of record: its
 * title, identifier, image, status, the facts a hover summary lists, and how
 * to open it. Descriptors are stored in the shared `universe/registry-service`
 * so the host application and every engine read the same set, and resolved
 * by model name, alias, polymorphic type string or PHP class basename.
 *
 * Everything here is tolerant: unknown input resolves to `null`, and reading
 * or opening never throws, so a template can always fall back to plain text.
 */

export const REGISTRY_SECTION = 'resource-identity';
export const DESCRIPTOR_LIST = 'descriptors';
const INDEX_LIST = 'index';
const INDEX_KEY = 'index';

export const COMPONENT_KINDS = {
    pill: 'pill',
    summary: 'summary',
    identity: 'identity',
    'select-option': 'selectOption',
    selectOption: 'selectOption',
};

const DEFAULT_COMPONENT_NAMES = {
    pill: (key) => `${key}/pill`,
    summary: (key) => `${key}/summary`,
    identity: (key) => `table/cell/${key}-identity`,
    selectOption: (key) => `select-option/${key}`,
};

/** Model-name prefixes that wrap a canonical resource in a polymorphic subtype. */
export const SUBTYPE_PREFIXES = ['facilitator-', 'maintenance-subject-', 'customer-', 'attachable-'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fallbackStores = new WeakMap();

function lookupService(owner, name) {
    try {
        return owner?.lookup?.(`service:${name}`) ?? null;
    } catch {
        return null;
    }
}

/**
 * Where descriptors live: the universe registry service when the owner can
 * reach it, otherwise a per-owner in-memory store (a dummy app or a test
 * without ember-core services).
 */
function getStore(owner) {
    if (!owner) {
        return null;
    }

    const service = lookupService(owner, 'universe/registry-service');

    if (service && typeof service.register === 'function' && typeof service.getRegistry === 'function' && typeof service.lookup === 'function') {
        return {
            list: (name) => service.getRegistry(REGISTRY_SECTION, name),
            put: (name, key, value) => service.register(REGISTRY_SECTION, name, key, value),
            find: (name, key) => service.lookup(REGISTRY_SECTION, name, key),
        };
    }

    let store = fallbackStores.get(owner);

    if (!store) {
        const lists = new Map();
        const listFor = (name) => {
            if (!lists.has(name)) {
                lists.set(name, []);
            }

            return lists.get(name);
        };

        store = {
            list: (name) => listFor(name),
            put: (name, key, value) => {
                const list = listFor(name);
                const index = list.findIndex((item) => item._registryKey === key);

                value._registryKey = key;

                if (index === -1) {
                    list.push(value);
                } else {
                    list.splice(index, 1, value);
                }
            },
            find: (name, key) => listFor(name).find((item) => item._registryKey === key) ?? null,
        };

        fallbackStores.set(owner, store);
    }

    return store;
}

function uniqueStrings(values) {
    return [...new Set((values ?? []).filter((value) => typeof value === 'string' && value.trim() !== '').map((value) => value.trim()))];
}

function normalizeDescriptor(descriptor) {
    const key = descriptor.key.trim();
    const components = descriptor.components ?? {};

    return {
        ...descriptor,
        key,
        labelKey: descriptor.labelKey ?? `resource.${key}`,
        icon: descriptor.icon ?? 'cube',
        aliases: uniqueStrings(descriptor.aliases),
        modelNames: uniqueStrings([key, ...(descriptor.modelNames ?? [])]),
        polymorphicTypes: uniqueStrings(descriptor.polymorphicTypes),
        statusTones: descriptor.statusTones ?? {},
        components: {
            pill: components.pill ?? DEFAULT_COMPONENT_NAMES.pill(key),
            summary: components.summary ?? DEFAULT_COMPONENT_NAMES.summary(key),
            identity: components.identity ?? DEFAULT_COMPONENT_NAMES.identity(key),
            selectOption: components.selectOption ?? components['select-option'] ?? DEFAULT_COMPONENT_NAMES.selectOption(key),
        },
    };
}

function rebuildIndex(store) {
    const index = { byKey: {}, byAlias: {}, byModelName: {}, byType: {} };

    for (const descriptor of store.list(DESCRIPTOR_LIST)) {
        index.byKey[descriptor.key] = descriptor.key;
        descriptor.aliases.forEach((alias) => (index.byAlias[alias] = descriptor.key));
        descriptor.modelNames.forEach((modelName) => (index.byModelName[modelName] = descriptor.key));
        descriptor.polymorphicTypes.forEach((type) => {
            index.byType[type] = descriptor.key;
            index.byType[type.toLowerCase()] = descriptor.key;
        });
    }

    store.put(INDEX_LIST, INDEX_KEY, index);

    return index;
}

function getIndex(owner) {
    const store = getStore(owner);

    if (!store) {
        return null;
    }

    return store.find(INDEX_LIST, INDEX_KEY) ?? rebuildIndex(store);
}

/**
 * Registers one descriptor. Returns the stored (normalized) descriptor.
 */
export function registerResourceDescriptor(owner, descriptor) {
    return registerResourceDescriptors(owner, [descriptor])[0] ?? null;
}

/**
 * Registers a list of descriptors and rebuilds the lookup indexes once.
 * A descriptor with the same key replaces the earlier one.
 */
export function registerResourceDescriptors(owner, descriptors) {
    const store = getStore(owner);

    if (!store) {
        return [];
    }

    const list = (isArray(descriptors) ? descriptors : [descriptors]).filter((descriptor) => descriptor && typeof descriptor.key === 'string' && descriptor.key.trim() !== '');
    const normalized = list.map(normalizeDescriptor);

    normalized.forEach((descriptor) => store.put(DESCRIPTOR_LIST, descriptor.key, descriptor));
    rebuildIndex(store);

    return normalized;
}

/**
 * Lets another package supply (or replace) how a resource opens, for example
 * an engine that owns the page for a core resource.
 */
export function setResourceOpener(owner, key, open, options = {}) {
    const descriptor = getResourceDescriptor(owner, key);

    if (!descriptor) {
        return false;
    }

    descriptor.open = open;

    if ('permission' in options) {
        descriptor.permission = options.permission;
    }

    if ('canOpen' in options) {
        descriptor.canOpen = options.canOpen;
    }

    return true;
}

/** Every registered descriptor. */
export function getResourceDescriptors(owner) {
    const store = getStore(owner);

    return store ? [...store.list(DESCRIPTOR_LIST)] : [];
}

function normalizeName(raw) {
    let name = raw.trim();

    if (name.includes('\\')) {
        name = name.slice(name.lastIndexOf('\\') + 1);
    }

    if (name.includes(':')) {
        name = name.slice(name.lastIndexOf(':') + 1);
    }

    return dasherize(name).toLowerCase();
}

function lookupName(index, raw) {
    if (typeof raw !== 'string' || raw.trim() === '') {
        return null;
    }

    const exact = raw.trim();

    if (index.byType[exact] || index.byType[exact.toLowerCase()]) {
        return index.byType[exact] ?? index.byType[exact.toLowerCase()];
    }

    const name = normalizeName(exact);
    const direct = index.byKey[name] ?? index.byAlias[name] ?? index.byModelName[name] ?? index.byType[name];

    if (direct) {
        return direct;
    }

    for (const prefix of SUBTYPE_PREFIXES) {
        if (name.startsWith(prefix)) {
            const stripped = name.slice(prefix.length);
            const key = index.byKey[stripped] ?? index.byAlias[stripped] ?? index.byModelName[stripped];

            if (key) {
                return key;
            }
        }
    }

    return null;
}

function candidateNames(input) {
    if (typeof input === 'string') {
        return [input];
    }

    if (!input || typeof input !== 'object') {
        return [];
    }

    const record = input instanceof ObjectProxy ? (input.content ?? input) : input;

    return [get(record, 'constructor.modelName'), get(record, 'resourceType'), get(record, 'resource_type'), get(record, 'modelName')].filter((name) => typeof name === 'string');
}

/**
 * Resolves anything that names a resource to its descriptor key, or `null`.
 * Accepts a record, a stub carrying `resourceType`, a model name or alias,
 * a `prefix:key` string, a PHP class name, or a polymorphic type string.
 */
export function resolveResourceKey(owner, input) {
    const index = getIndex(owner);

    if (!index) {
        return null;
    }

    for (const name of candidateNames(input)) {
        const key = lookupName(index, name);

        if (key) {
            return key;
        }
    }

    return null;
}

/** The descriptor for anything `resolveResourceKey` understands, or `null`. */
export function getResourceDescriptor(owner, input) {
    const key = resolveResourceKey(owner, input);

    if (!key) {
        return null;
    }

    return getStore(owner).find(DESCRIPTOR_LIST, key) ?? null;
}

/** Whether `owner` can render the named component. */
export function isComponentResolvable(owner, name) {
    if (!name) {
        return false;
    }

    if (typeof name !== 'string') {
        return typeof name === 'function' || typeof name === 'object';
    }

    try {
        return Boolean(owner?.factoryFor?.(`component:${name}`)) || Boolean(owner?.lookup?.(`template:components/${name}`));
    } catch {
        return false;
    }
}

/**
 * The component name registered for a kind (`pill`, `summary`, `identity`,
 * `select-option`) of a resource, or `null` when the resource is unknown or
 * the component cannot be resolved by `owner`.
 */
export function resourceComponentName(owner, kind, input) {
    const field = COMPONENT_KINDS[kind];

    if (!field) {
        return null;
    }

    const descriptor = getResourceDescriptor(owner, input);
    const name = descriptor?.components?.[field];

    if (!name || !isComponentResolvable(owner, name)) {
        return null;
    }

    return name;
}

function unwrapSync(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (value instanceof ObjectProxy) {
        return value.content ?? null;
    }

    if (typeof value === 'object' && typeof value.then === 'function' && 'content' in value) {
        return value.content ?? null;
    }

    return value;
}

/**
 * Reads a relation without ever returning a promise proxy: the loaded
 * record (or many-array) for a model, the plain value for a POJO, else null.
 */
export function relationValue(record, name) {
    if (!record || typeof name !== 'string' || name === '') {
        return null;
    }

    const target = unwrapSync(record);

    if (!target) {
        return null;
    }

    if (typeof target.belongsTo === 'function') {
        try {
            const reference = target.belongsTo(name);

            if (reference && typeof reference.value === 'function') {
                return unwrapSync(reference.value());
            }
        } catch {
            // not a belongsTo on this model; fall through
        }
    }

    if (typeof target.hasMany === 'function') {
        try {
            const reference = target.hasMany(name);

            if (reference && typeof reference.value === 'function') {
                return reference.value() ?? null;
            }
        } catch {
            // not a hasMany either; fall through
        }
    }

    return unwrapSync(get(target, name));
}

/** A display identifier, or `null` when the value is blank or a UUID. */
export function safeIdentifier(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim();

    if (text === '' || UUID_PATTERN.test(text)) {
        return null;
    }

    return value;
}

/** Whether the value is a UUID string. */
export function isUuidValue(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

/**
 * Resolves proxies, thenables and identity stubs to the record they stand
 * for. A stub is any object with a `loadResource()` function.
 */
export async function unwrapResource(input) {
    let value = input;

    for (let step = 0; step < 8 && value; step++) {
        if (typeof value.then === 'function') {
            value = await value;
            continue;
        }

        if (value instanceof ObjectProxy) {
            value = value.content ?? null;
            continue;
        }

        if (typeof value.loadResource === 'function') {
            const loaded = await value.loadResource();

            return loaded ?? value;
        }

        break;
    }

    return value ?? null;
}

async function loadCanonicalRecord(owner, descriptor, record) {
    const modelName = get(record, 'constructor.modelName');
    const canonical = descriptor.modelNames[0];

    if (typeof modelName !== 'string' || modelName === canonical) {
        return record;
    }

    const store = lookupService(owner, 'store');
    const id = get(record, 'id') ?? get(record, 'uuid');

    if (!store || !id) {
        return record;
    }

    const peeked = typeof store.peekRecord === 'function' ? store.peekRecord(canonical, id) : null;

    if (peeked) {
        return peeked;
    }

    if (typeof store.findRecord === 'function') {
        return (await store.findRecord(canonical, id)) ?? record;
    }

    return record;
}

/**
 * Whether the resource has an open path the current user may use.
 * `options.resourceType` names the type of a record that cannot be
 * resolved on its own.
 */
export function canOpenResource(owner, input, options = {}) {
    const descriptor = getResourceDescriptor(owner, input) ?? getResourceDescriptor(owner, options.resourceType);

    if (!descriptor || typeof descriptor.open !== 'function') {
        return false;
    }

    const record = typeof input === 'object' ? unwrapSync(input) : null;

    if (typeof descriptor.canOpen === 'function') {
        try {
            if (!descriptor.canOpen(record, owner)) {
                return false;
            }
        } catch {
            return false;
        }
    }

    const permission = typeof descriptor.permission === 'function' ? descriptor.permission(record) : descriptor.permission;

    if (permission) {
        const abilities = lookupService(owner, 'abilities');

        if (abilities && typeof abilities.can === 'function') {
            try {
                return Boolean(abilities.can(permission));
            } catch {
                return false;
            }
        }
    }

    return true;
}

/**
 * Opens a resource through its descriptor. Unwraps proxies and stubs, loads
 * the canonical record for a subtype, and returns `true` only when the
 * descriptor reported that it handled the open. Never throws.
 */
export async function openResource(owner, input, options = {}) {
    try {
        const record = await unwrapResource(input);

        if (!record) {
            return false;
        }

        const descriptor = getResourceDescriptor(owner, record) ?? getResourceDescriptor(owner, options.resourceType);

        if (!descriptor || typeof descriptor.open !== 'function') {
            return false;
        }

        const canonical = await loadCanonicalRecord(owner, descriptor, record);
        const result = await descriptor.open(canonical, { ...options, owner, event: options.event ?? null });

        return Boolean(result);
    } catch {
        return false;
    }
}

/**
 * Calls a descriptor function field safely: `undefined` when the field is
 * missing, not a function, or throws.
 */
export function readDescriptor(descriptor, field, ...args) {
    const value = descriptor?.[field];

    if (typeof value !== 'function') {
        return value;
    }

    try {
        return value(...args);
    } catch {
        return undefined;
    }
}
