/**
 * The shared resource view registry service from `@fleetbase/ember-core`, or
 * `null` when this build has none.
 *
 * Looked up rather than injected: an engine built against an older ember-core
 * does not provide it, and a missing registry must leave every view exactly as
 * it was.
 *
 * @param {Object} owner
 * @returns {Object|null}
 */
export default function lookupResourceView(owner) {
    try {
        return owner?.lookup('service:universe/resource-view-service') ?? null;
    } catch {
        return null;
    }
}

/**
 * Merge what extensions registered into a view's header buttons.
 *
 * `actions` buttons are merged in place. `menu` items go into the first
 * button that already has a dropdown (`items`), or into a new "…" dropdown
 * when there is none.
 *
 * @param {Object|null} resourceView
 * @param {String} registry A surface prefix, e.g. `ledger:invoice:details`
 * @param {Array} buttons
 * @param {Object} context
 * @param {Object} options
 * @param {Boolean} options.withMenu Whether to merge the `menu` slot (details views)
 * @returns {Array}
 */
export function mergeHeaderButtons(resourceView, registry, buttons, context = {}, { withMenu = false } = {}) {
    const base = buttons ?? [];
    if (!resourceView || !registry) {
        return base;
    }

    const merged = resourceView.mergeSlot(registry, 'actions', base, context);
    if (!withMenu) {
        return merged;
    }

    const dropdownIndex = merged.findIndex((button) => Array.isArray(button?.items));
    if (dropdownIndex !== -1) {
        const dropdown = merged[dropdownIndex];
        const items = resourceView.mergeSlot(registry, 'menu', dropdown.items, context);
        return [...merged.slice(0, dropdownIndex), { ...dropdown, items }, ...merged.slice(dropdownIndex + 1)];
    }

    const items = resourceView.mergeSlot(registry, 'menu', [], context);
    return items.length ? [...merged, { id: 'registered-menu', icon: 'ellipsis-h', iconPrefix: 'fas', prefix: 'fas', renderInPlace: true, items }] : merged;
}
