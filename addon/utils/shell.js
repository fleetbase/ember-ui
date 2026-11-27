/**
 * Helpers shared by the canvas shell's navigation chrome (context bar, dock,
 * top bar, command palette).
 *
 * The chrome reads services that ember-core is gaining alongside it (`dock`,
 * `context-bar`, `universe.getSearchProviders`). ember-ui must keep working
 * against an ember-core that does not have them yet, so every one of them is
 * looked up as optional and the chrome falls back to what exists today.
 */

const TONES = ['info', 'warn', 'ok', 'error', 'menu'];

/**
 * Looks a service up without asserting that it exists. `@service foo` throws
 * when `service:foo` is not registered; this returns null instead.
 *
 * @param {Object} owner
 * @param {String} name
 * @returns {Object|null}
 */
export function optionalService(owner, name) {
    return owner.lookup(`service:${name}`) || null;
}

/**
 * Whether `object[method]` can be called.
 */
export function hasMethod(object, method) {
    return Boolean(object) && typeof object[method] === 'function';
}

/**
 * The route, models and query params a menu item, crumb or search result
 * points at. Accepts both the shell's own shape (`route`, `models`, `query`)
 * and ember-core's menu-item shape (`route`, `routeParams`, `slug`, `view`,
 * `queryParams`), where items registered by title share a `*.virtual` route
 * that takes the slug as its model and the view as a query param.
 *
 * @param {Object} item
 * @returns {{route: String, models: Array, queryParams: Object}}
 */
export function routeTarget(item) {
    let models = [];
    if (Array.isArray(item.models)) {
        models = item.models;
    } else if (Array.isArray(item.routeParams) && item.routeParams.length) {
        models = item.routeParams;
    } else if (item.slug && String(item.route).endsWith('.virtual')) {
        models = [item.slug];
    }

    const queryParams = { ...(item.query || item.queryParams || {}) };
    if (item.view) {
        queryParams.view = item.view;
    }

    return { route: item.route, models, queryParams };
}

/**
 * Activates a menu item, crumb or search result: its own `action` or `onClick`
 * when it has one, otherwise a transition to its route. Items with neither do
 * nothing.
 *
 * @param {Object} router
 * @param {Object} item
 */
export function activateItem(router, item) {
    if (typeof item.action === 'function') {
        return item.action(item);
    }

    if (typeof item.onClick === 'function') {
        return item.onClick(item);
    }

    if (!item.route) {
        return;
    }

    const { route, models, queryParams } = routeTarget(item);
    return router.transitionTo(route, ...models, { queryParams });
}

/**
 * Whether the router is on `route` or one of its children.
 */
export function isRouteActive(router, route) {
    if (!route) {
        return false;
    }

    return String(router.currentRouteName || '').startsWith(route);
}

/**
 * The modifier-key symbol for shortcut hints: ⌘ on Apple platforms, Ctrl
 * elsewhere.
 *
 * @param {String} [platform] defaults to the browser's platform
 */
export function modifierKeyLabel(platform = window.navigator.platform) {
    return /mac|iphone|ipad/i.test(platform) ? '⌘' : 'Ctrl ';
}

/**
 * Whether a keyboard event carries the platform's command modifier.
 */
export function hasCommandModifier(event) {
    return event.metaKey || event.ctrlKey;
}

/**
 * Whether a keyboard event comes from somewhere the user is typing.
 */
export function isTypingTarget(target) {
    if (!target || !target.tagName) {
        return false;
    }

    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable === true;
}

/**
 * A known tone, or `info` for anything else.
 */
export function normalizeTone(tone) {
    return TONES.includes(tone) ? tone : 'info';
}

/**
 * The dock's view of a header menu item. ember-core's menu items gain the
 * optional `color`, `status`, `badge`, `shortcut` and `group`; every one of
 * them has a default here so an item registered before they existed still
 * renders.
 *
 * @param {Object} item a header menu item
 * @param {Number} index its position in the dock
 * @param {Object} [options]
 * @param {Array} [options.lockedIds]
 * @param {String} [options.modifierKey]
 */
export function dockEntry(item, index, { lockedIds = [], modifierKey = modifierKeyLabel() } = {}) {
    const status = item.status ? { tone: normalizeTone(item.status.tone), text: item.status.text } : null;
    const shortcut = item.shortcut || (index < 9 ? `${modifierKey}${index + 1}` : null);

    return {
        item,
        id: item.id,
        title: item.title,
        icon: item.icon || 'circle-dot',
        iconPrefix: item.iconPrefix,
        iconComponent: item.iconComponent,
        iconComponentOptions: item.iconComponentOptions,
        color: item.color || null,
        status,
        badge: item.badge === undefined || item.badge === null ? null : String(item.badge),
        shortcut,
        keyShortcuts: index < 9 ? `Meta+${index + 1} Control+${index + 1}` : null,
        group: item.group || null,
        route: item.route,
        locked: lockedIds.includes(item.id),
        label: status ? `${item.title}, ${status.text}` : item.title,
    };
}

/**
 * The pages a module registers for its dock flyout: each menu panel of the
 * `engine:<id>` registry as a titled group, then any loose menu items as an
 * untitled one. Returns an empty list when the menu service is missing or has
 * nothing for the module.
 *
 * @param {Object} universe
 * @param {String} moduleId
 * @returns {Array<{title: String|null, items: Array}>}
 */
export function modulePages(universe, moduleId) {
    const menuService = universe && universe.menuService;
    const registry = `engine:${moduleId}`;
    const groups = [];

    if (hasMethod(menuService, 'getMenuPanels')) {
        for (const panel of menuService.getMenuPanels(registry) || []) {
            groups.push({ title: panel.title || null, items: panel.items || [] });
        }
    }

    if (hasMethod(menuService, 'getMenuItems')) {
        const loose = (menuService.getMenuItems(registry) || []).filter((item) => !item._isPanelItem);
        if (loose.length) {
            groups.push({ title: null, items: loose });
        }
    }

    return groups;
}

/**
 * Keeps only the groups' items whose title contains `query` (case-insensitive),
 * dropping groups left empty. An empty query returns the groups unchanged.
 */
export function filterGroups(groups, query) {
    const needle = String(query || '')
        .trim()
        .toLowerCase();
    if (!needle) {
        return groups;
    }

    return groups.map((group) => ({ ...group, items: group.items.filter((item) => String(item.title).toLowerCase().includes(needle)) })).filter((group) => group.items.length > 0);
}

/**
 * Moves focus within `elements` by `step` from whichever one has it, wrapping
 * at both ends. With no focused element it focuses the first (step > 0) or the
 * last (step < 0). `Infinity` / `-Infinity` jump to the end / start.
 *
 * @returns {HTMLElement|null} the element focused
 */
export function moveFocus(elements, step) {
    const list = [...elements];
    if (!list.length) {
        return null;
    }

    let next;
    if (step === Infinity) {
        next = list.length - 1;
    } else if (step === -Infinity) {
        next = 0;
    } else {
        const current = list.indexOf(document.activeElement);
        if (current === -1) {
            next = step > 0 ? 0 : list.length - 1;
        } else {
            next = (current + step + list.length) % list.length;
        }
    }

    list[next].focus();
    return list[next];
}

/**
 * Initials for an avatar: the first letter of the first two words.
 */
export function initials(name) {
    return String(name || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}
