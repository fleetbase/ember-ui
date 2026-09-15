import { get } from '@ember/object';
import { relationValue, safeIdentifier } from '../resource-registry';

/**
 * Descriptors for the console's core resources: user, company, group, role,
 * file and category. They read attributes by duck typing so a POJO from an
 * API payload renders the same as an Ember Data record.
 *
 * None of them opens anything by default: the console has no per-record
 * routes for these. An engine that owns such a page registers an opener
 * with `setResourceOpener(owner, key, fn)`.
 */

const FILE_ICONS = {
    xlsx: 'file-excel',
    xls: 'file-excel',
    xlsb: 'file-excel',
    xlsm: 'file-excel',
    csv: 'file-csv',
    tsv: 'file-csv',
    doc: 'file-word',
    docx: 'file-word',
    docm: 'file-word',
    pdf: 'file-pdf',
    ppt: 'file-powerpoint',
    pptx: 'file-powerpoint',
    zip: 'file-zipper',
    gz: 'file-zipper',
    tar: 'file-zipper',
    mp4: 'file-video',
    mov: 'file-video',
    mp3: 'file-audio',
    wav: 'file-audio',
    txt: 'file-lines',
    md: 'file-lines',
    json: 'file-code',
    js: 'file-code',
    xml: 'file-code',
};

function present(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function first(record, ...paths) {
    for (const path of paths) {
        const value = get(record, path);

        if (present(value)) {
            return value;
        }
    }

    return null;
}

function count(record, path, countPath) {
    const counted = get(record, countPath);

    if (typeof counted === 'number') {
        return counted;
    }

    const relation = relationValue(record, path);

    if (relation && typeof relation.length === 'number') {
        return relation.length;
    }

    return null;
}

export function fileExtension(file) {
    const name = first(file ?? {}, 'original_filename', 'url', 'path');

    if (typeof name !== 'string') {
        return null;
    }

    const match = name.split('?')[0].match(/\.([a-z0-9]+)$/i);

    return match ? match[1].toLowerCase() : null;
}

export function isImageFile(file) {
    const type = get(file ?? {}, 'content_type');

    if (typeof type === 'string') {
        return type.startsWith('image/');
    }

    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(fileExtension(file));
}

export function fileIcon(file) {
    return FILE_ICONS[fileExtension(file)] ?? 'file';
}

export function buildCoreResourceDescriptors() {
    return [
        {
            key: 'user',
            labelKey: 'resource.user',
            icon: 'user',
            modelNames: ['user'],
            polymorphicTypes: ['Fleetbase\\Models\\User', 'core:user'],
            title: (user) => first(user, 'name', 'email', 'public_id'),
            identifier: (user) => first(user, 'email', 'phone'),
            image: (user) => ({ url: get(user, 'avatar_url'), shape: 'round' }),
            online: (user) => {
                const online = get(user, 'is_online') ?? get(user, 'online');

                return typeof online === 'boolean' ? online : undefined;
            },
            status: (user) => first(user, 'status', 'session_status'),
            badges: (user) => {
                const role = first(user, 'role_name', 'role.name', 'type');

                return role ? [{ key: 'role', icon: 'user-shield', label: role }] : [];
            },
            selectDetails: (user) => [first(user, 'email'), first(user, 'phone')],
            facts: (user) => [
                { labelKey: 'resource-summary.facts.email', label: 'Email', value: first(user, 'email') },
                { labelKey: 'resource-summary.facts.phone', label: 'Phone', value: first(user, 'phone') },
                { labelKey: 'resource-summary.facts.role', label: 'Role', value: first(user, 'role_name', 'role.name', 'type') },
                { labelKey: 'resource-summary.facts.company', label: 'Company', value: first(user, 'company_name', 'company.name') },
                { labelKey: 'resource-summary.facts.last-seen', label: 'Last seen', value: get(user, 'last_seen_at') ?? get(user, 'last_login') ?? get(user, 'created_at'), format: 'date' },
                { labelKey: 'resource-summary.facts.status', label: 'Status', value: first(user, 'status', 'session_status'), format: 'humanize' },
            ],
        },
        {
            key: 'company',
            labelKey: 'resource.company',
            icon: 'building',
            modelNames: ['company', 'organization'],
            aliases: ['organization'],
            polymorphicTypes: ['Fleetbase\\Models\\Company', 'core:company'],
            title: (company) => first(company, 'name', 'public_id'),
            identifier: (company) => safeIdentifier(first(company, 'public_id', 'slug')),
            image: (company) => ({ url: get(company, 'logo_url'), shape: 'square' }),
            status: (company) => first(company, 'status'),
            badges: (company) => {
                const plan = first(company, 'plan', 'type');

                return plan ? [{ key: 'plan', icon: 'tag', label: plan }] : [];
            },
            selectDetails: (company) => [first(company, 'country'), first(company, 'timezone')],
            facts: (company) => [
                { labelKey: 'resource-summary.facts.owner', label: 'Owner', related: relationValue(company, 'owner'), relatedType: 'user', value: first(company, 'owner.name', 'owner_name') },
                { labelKey: 'resource-summary.facts.members', label: 'Members', value: count(company, 'users', 'users_count') },
                { labelKey: 'resource-summary.facts.country', label: 'Country', value: first(company, 'country') },
                { labelKey: 'resource-summary.facts.timezone', label: 'Timezone', value: first(company, 'timezone') },
                { labelKey: 'resource-summary.facts.status', label: 'Status', value: first(company, 'status'), format: 'humanize' },
            ],
        },
        {
            key: 'group',
            labelKey: 'resource.group',
            icon: 'users',
            modelNames: ['group'],
            polymorphicTypes: ['Fleetbase\\Models\\Group', 'core:group'],
            title: (group) => first(group, 'name', 'public_id'),
            identifier: (group) => {
                const members = count(group, 'users', 'users_count');

                return typeof members === 'number' ? `${members} member${members === 1 ? '' : 's'}` : null;
            },
            image: () => ({ icon: 'users' }),
            selectDetails: (group) => [first(group, 'description')],
            facts: (group) => [
                { labelKey: 'resource-summary.facts.description', label: 'Description', value: first(group, 'description') },
                { labelKey: 'resource-summary.facts.members', label: 'Members', value: count(group, 'users', 'users_count') },
                { labelKey: 'resource-summary.facts.created', label: 'Created', value: get(group, 'created_at'), format: 'date' },
            ],
        },
        {
            key: 'role',
            labelKey: 'resource.role',
            icon: 'user-shield',
            modelNames: ['role'],
            polymorphicTypes: ['Fleetbase\\Models\\Role', 'core:role'],
            title: (role) => first(role, 'name', 'public_id'),
            identifier: (role) => first(role, 'guard_name', 'type'),
            image: () => ({ icon: 'user-shield' }),
            badges: (role) => {
                const service = first(role, 'service');

                return service ? [{ key: 'service', icon: 'cubes', label: service }] : [];
            },
            selectDetails: (role) => [first(role, 'description'), first(role, 'guard_name')],
            facts: (role) => [
                { labelKey: 'resource-summary.facts.description', label: 'Description', value: first(role, 'description') },
                { labelKey: 'resource-summary.facts.guard', label: 'Guard', value: first(role, 'guard_name', 'type') },
                { labelKey: 'resource-summary.facts.policies', label: 'Policies', value: count(role, 'policies', 'policies_count') },
                { labelKey: 'resource-summary.facts.permissions', label: 'Permissions', value: count(role, 'permissions', 'permissions_count') },
            ],
        },
        {
            key: 'file',
            labelKey: 'resource.file',
            icon: 'file',
            modelNames: ['file'],
            polymorphicTypes: ['Fleetbase\\Models\\File', 'core:file'],
            title: (file) => first(file, 'original_filename', 'caption', 'url', 'public_id'),
            identifier: (file) => first(file, 'content_type', 'type'),
            image: (file) => (isImageFile(file) && present(get(file, 'url')) ? { url: get(file, 'url'), shape: 'square' } : { icon: fileIcon(file) }),
            badges: (file) => {
                const extension = fileExtension(file);

                return extension ? [{ key: 'extension', icon: 'file', label: extension.toUpperCase() }] : [];
            },
            selectDetails: (file) => [first(file, 'content_type', 'type'), typeof get(file, 'file_size') === 'number' ? get(file, 'file_size') : null].filter(present),
            facts: (file) => [
                { labelKey: 'resource-summary.facts.type', label: 'Type', value: first(file, 'content_type', 'type') },
                { labelKey: 'resource-summary.facts.size', label: 'Size', value: get(file, 'file_size'), format: 'bytes' },
                { labelKey: 'resource-summary.facts.uploader', label: 'Uploaded by', related: relationValue(file, 'uploader'), relatedType: 'user', value: first(file, 'uploader.name', 'uploader_name') },
                { labelKey: 'resource-summary.facts.created', label: 'Uploaded', value: get(file, 'created_at'), format: 'date' },
            ],
            canOpen: (file) => present(get(file ?? {}, 'url')),
            open: (file) => {
                const url = get(file, 'url');

                if (!present(url)) {
                    return false;
                }

                window.open(url, '_blank', 'noopener');

                return true;
            },
        },
        {
            key: 'category',
            labelKey: 'resource.category',
            icon: 'folder',
            modelNames: ['category'],
            polymorphicTypes: ['Fleetbase\\Models\\Category', 'core:category'],
            title: (category) => first(category, 'name', 'slug', 'public_id'),
            identifier: (category) => first(category, 'for', 'slug'),
            image: (category) => {
                const icon = get(category, 'icon');
                const url = get(category, 'icon_url');

                if (present(icon)) {
                    return { icon };
                }

                return present(url) ? { url, shape: 'square' } : { icon: 'folder' };
            },
            badges: (category) => {
                const parent = first(category, 'parent.name', 'parent_name');

                return parent ? [{ key: 'parent', icon: 'folder-tree', label: parent }] : [];
            },
            selectDetails: (category) => [first(category, 'for'), first(category, 'description')],
            facts: (category) => [
                { labelKey: 'resource-summary.facts.parent', label: 'Parent', related: relationValue(category, 'parent'), relatedType: 'category', value: first(category, 'parent.name', 'parent_name') },
                { labelKey: 'resource-summary.facts.for', label: 'For', value: first(category, 'for', 'owner_type') },
                { labelKey: 'resource-summary.facts.icon', label: 'Icon', value: first(category, 'icon') },
                { labelKey: 'resource-summary.facts.colour', label: 'Colour', value: first(category, 'icon_color') },
                { labelKey: 'resource-summary.facts.description', label: 'Description', value: first(category, 'description') },
            ],
        },
    ];
}

export default buildCoreResourceDescriptors;
