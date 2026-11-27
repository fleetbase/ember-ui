import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { activateItem, filterGroups, isRouteActive, modulePages, moveFocus } from '../../../utils/shell';

/**
 * `Layout::Dock::Flyout` — a module's pages, opened from the dock.
 *
 * Pages are the menu panels and items the module registers in the
 * `engine:<id>` registry of ember-core's menu service, filterable from the
 * search field. Pinned (`@pinned`) it stays open as a rail.
 *
 * The flyout element is always rendered, `hidden` while closed, because it
 * holds `#sidebar-menu-items` — the compatibility adapter for engines that
 * still wormhole their sidebar in with `Layout::YieldSidebar`. That sidebar
 * belongs to the current route's engine, so it is shown only while the flyout
 * is open on the current module (`@showsAdapter`).
 */
export default class LayoutDockFlyoutComponent extends Component {
    @service universe;
    @service router;
    @tracked filter = { id: null, text: '' };

    get query() {
        return this.args.entry && this.filter.id === this.args.entry.id ? this.filter.text : '';
    }

    /** Rendered only while there is an `@entry`. */
    get groups() {
        const groups = filterGroups(modulePages(this.universe, this.args.entry.id), this.query);
        return groups.map((group) => ({
            title: group.title,
            items: group.items.map((item) => ({ item, title: item.title, icon: item.icon, isCurrent: this.isCurrent(item) })),
        }));
    }

    get label() {
        return this.args.entry ? `${this.args.entry.title} pages` : 'Module pages';
    }

    isCurrent(item) {
        if (!isRouteActive(this.router, item.route)) {
            return false;
        }

        const queryParams = (this.router.currentRoute && this.router.currentRoute.queryParams) || {};
        return !item.view || queryParams.view === item.view;
    }

    @action updateFilter(event) {
        this.filter = { id: this.args.entry.id, text: event.target.value };
    }

    @action openPage(page) {
        activateItem(this.router, page.item);
        if (!this.args.pinned && typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action onKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (typeof this.args.onClose === 'function') {
                this.args.onClose();
            }
            return;
        }

        const steps = { ArrowDown: 1, ArrowUp: -1 };
        if (event.key in steps) {
            event.preventDefault();
            moveFocus(event.currentTarget.querySelectorAll('.fb-dock-flyout-filter-input, .fb-dock-flyout-page'), steps[event.key]);
        }
    }
}
