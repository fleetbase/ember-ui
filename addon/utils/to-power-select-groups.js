import smartHumanize from './smart-humanize';
import { isArray } from '@ember/array';

/**
 * Convert flat options with a `group` key into ember-power-select grouped options.
 *
 * @param {Array<Object>} items - Flat array like [{ label, value, description, group }, ...]
 * @param {Object} [opts]
 * @param {string} [opts.groupKey='group'] - Which property on each item holds the group value.
 * @param {Record<string,string>} [opts.groupLabelMap] - Optional mapping from group value -> custom group header label.
 * @param {'asc'|'desc'|false} [opts.groupSort='asc'] - Sort groups alphabetically by header. Set false to keep insertion order.
 * @param {'asc'|'desc'|false} [opts.optionSort='asc'] - Sort options in each group by `label`. Set false to keep order.
 * @param {string} [opts.fallbackGroup='Other'] - Group name if an item has no group.
 * @returns {Array<{ groupName: string, options: Array<Object> }>}
 */
export default function toPowerSelectGroups(items, opts = {}) {
    const { groupKey = 'group', groupLabelMap, groupSort = 'asc', optionSort = 'asc', fallbackGroup = 'Other' } = opts;

    if (!isArray(items) || items.length === 0) return [];

    const map = new Map(); // key -> { groupName, options: [] }

    for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const rawKey = item[groupKey] ?? null;
        const key = typeof rawKey === 'string' && rawKey.trim().length ? rawKey : null;

        // Determine display label for group header
        const groupName = (key && groupLabelMap && groupLabelMap[key]) || (key && smartHumanize(key)) || fallbackGroup;

        // Get/create group bucket
        let bucket = map.get(groupName);
        if (!bucket) {
            bucket = { groupName, options: [] };
            map.set(groupName, bucket);
        }

        // Push a shallow copy (keep original fields; you can strip group if you want)
        bucket.options.push({ ...item });
    }

    // Sorting
    let groups = Array.from(map.values());

    if (optionSort) {
        const dir = optionSort === 'desc' ? -1 : 1;
        for (const g of groups) {
            g.options.sort((a, b) => compareByLabel(a, b, dir));
        }
    }

    if (groupSort) {
        const dir = groupSort === 'desc' ? -1 : 1;
        groups.sort((a, b) => {
            const A = (a.groupName || '').toLowerCase();
            const B = (b.groupName || '').toLowerCase();
            if (A < B) return -1 * dir;
            if (A > B) return 1 * dir;
            return 0;
        });
    }

    return groups;
}

/** Case-insensitive label comparison; falls back to value */
function compareByLabel(a, b, dir) {
    const A = (a?.label ?? a?.value ?? '').toString().toLowerCase();
    const B = (b?.label ?? b?.value ?? '').toString().toLowerCase();
    if (A < B) return -1 * dir;
    if (A > B) return 1 * dir;
    return 0;
}
