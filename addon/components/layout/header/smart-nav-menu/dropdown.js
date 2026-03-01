import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { dasherize } from '@ember/string';
import { isArray } from '@ember/array';
import { htmlSafe } from '@ember/template';

/**
 * Layout::Header::SmartNavMenu::Dropdown
 *
 * Phase 2: multi-column card grid + search filter.
 *
 * Shortcuts are expanded as independent sibling items in the grid (AWS-style).
 * Each shortcut is normalised into a flat display item with `_isShortcut: true`
 * so the template can render it with a slightly different visual treatment
 * (muted style, no pin button).
 */
export default class LayoutHeaderSmartNavMenuDropdownComponent extends Component {
    @tracked searchQuery = '';

    get positionStyle() {
        const top = this.args.top ?? 0;
        const left = this.args.left ?? 0;
        return htmlSafe('top: ' + top + 'px; left: ' + left + 'px;');
    }

    /**
     * Expand every MenuItem's shortcuts array into sibling flat items.
     * The resulting array interleaves parent items and their shortcuts in
     * registration order, matching the AWS Console pattern.
     *
     * Each shortcut is normalised to:
     *   { title, route, icon, iconPrefix, id, _isShortcut: true, _parentTitle }
     */
    get expandedItems() {
        const items = this.args.items ?? [];
        const result = [];
        for (const item of items) {
            result.push(item);
            if (isArray(item.shortcuts)) {
                for (const sc of item.shortcuts) {
                    const scId = sc.id ?? dasherize(item.id + '-sc-' + sc.title);
                    result.push({
                        // ── Identity ────────────────────────────────────────
                        id: scId,
                        slug: sc.slug ?? scId,
                        title: sc.title,
                        text: sc.text ?? sc.title,
                        label: sc.label ?? sc.title,

                        // ── Routing ──────────────────────────────────────────
                        route: sc.route ?? item.route,
                        queryParams: sc.queryParams ?? {},
                        routeParams: sc.routeParams ?? [],

                        // ── Icons (full surface) ─────────────────────────────
                        icon: sc.icon ?? item.icon ?? 'arrow-right',
                        iconPrefix: sc.iconPrefix ?? item.iconPrefix ?? null,
                        iconSize: sc.iconSize ?? null,
                        iconClass: sc.iconClass ?? null,
                        iconComponent: sc.iconComponent ?? null,
                        iconComponentOptions: sc.iconComponentOptions ?? {},

                        // ── Metadata ─────────────────────────────────────────
                        description: sc.description ?? null,
                        tags: isArray(sc.tags) ? sc.tags : isArray(item.tags) ? item.tags : null,

                        // ── Behaviour ────────────────────────────────────────
                        onClick: sc.onClick ?? null,
                        disabled: sc.disabled ?? false,

                        // ── Styling ───────────────────────────────────────────
                        class: sc.class ?? null,

                        // ── Internal flags ────────────────────────────────────
                        _isShortcut: true,
                        _parentTitle: item.title,
                        _parentId: item.id,
                    });
                }
            }
        }
        return result;
    }

    get filteredItems() {
        const query = (this.searchQuery || '').trim().toLowerCase();
        if (!query) {
            return this.expandedItems;
        }
        return this.expandedItems.filter((item) => {
            if ((item.title || '').toLowerCase().includes(query)) return true;
            if (item.description && item.description.toLowerCase().includes(query)) return true;
            if (item._parentTitle && item._parentTitle.toLowerCase().includes(query)) return true;
            // Match against any of the item's tags
            if (isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(query))) return true;
            return false;
        });
    }

    get hasNoResults() {
        return this.searchQuery.trim().length > 0 && this.filteredItems.length === 0;
    }

    @action updateSearch(event) {
        this.searchQuery = event.target.value;
    }

    @action clearSearch() {
        this.searchQuery = '';
    }

    @action handleItemClick(menuItem, event) {
        event?.preventDefault();
        if (menuItem && typeof menuItem.onClick === 'function') {
            menuItem.onClick(menuItem);
        }
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
