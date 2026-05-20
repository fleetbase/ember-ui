import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

const TAB_ALL = 'all';
const TAB_DEFAULT = 'default';
const TAB_ADDED = 'added';

/**
 * Side overlay that lists every registered dashboard widget and lets the user
 * add one (or many) to the current dashboard.
 *
 * Surface contract:
 *   - Pulls registry definitions via `widgetService.getWidgets(dashboardId)`.
 *   - Groups them by `Widget.category` (default 'General').
 *   - Filters by search across name + description + category.
 *   - Three tabs: All / Recommended (`default: true`) / On Dashboard.
 *   - Per-card "On dashboard ×N" badge driven by `options.widget_key` matches.
 *   - Click-to-add delegates to `dashboard.addWidget(...)` which strips the
 *     registry slug to avoid the identity-map collision.
 */
export default class DashboardWidgetPanelComponent extends Component {
    @service('universe/widget-service') widgetService;
    @service notifications;

    @tracked searchQuery = '';
    @tracked activeTab = TAB_ALL;
    @tracked hoveredWidget = null;

    get defaultDashboardId() {
        return this.args.defaultDashboardId ?? 'dashboard';
    }

    /** Every widget registered against the current dashboard scope. */
    get registryWidgets() {
        return this.widgetService.getWidgets(this.defaultDashboardId) ?? [];
    }

    /** Multiset of widget_keys present on the active dashboard. */
    get addedCounts() {
        const counts = new Map();
        const widgets = this.args.dashboard?.widgets ?? [];
        widgets.forEach((w) => {
            const key = w.options?.widget_key;
            if (!key) return;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        return counts;
    }

    // Arrow-function field so {{this.addedCount widget.id}} keeps `this` bound when
    // invoked through Glimmer's FunctionHelperManager.
    addedCount = (widgetKey) => {
        return this.addedCounts.get(widgetKey) ?? 0;
    };

    /** Filter by search query + active tab. */
    get filteredWidgets() {
        const q = this.searchQuery.toLowerCase().trim();
        const matchesSearch = (w) => {
            if (!q) return true;
            const name = (w.name ?? '').toLowerCase();
            const desc = (w.description ?? '').toLowerCase();
            const cat = (w.category ?? '').toLowerCase();
            return name.includes(q) || desc.includes(q) || cat.includes(q);
        };

        return this.registryWidgets.filter((w) => {
            if (!matchesSearch(w)) return false;
            if (this.activeTab === TAB_DEFAULT && !w.default) return false;
            if (this.activeTab === TAB_ADDED && this.addedCount(w.id) === 0) return false;
            return true;
        });
    }

    /** Group filtered widgets by category, preserving registry order within each group. */
    get groupedWidgets() {
        const groups = new Map();
        for (const w of this.filteredWidgets) {
            const key = w.category || 'General';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(w);
        }
        return Array.from(groups, ([title, widgets]) => ({ title, widgets }));
    }

    get tabs() {
        const all = this.registryWidgets;
        return [
            { key: TAB_ALL, label: 'tab-all', count: all.length },
            { key: TAB_DEFAULT, label: 'tab-default', count: all.filter((w) => w.default).length },
            { key: TAB_ADDED, label: 'tab-added', count: this.addedCounts.size },
        ];
    }

    @task *addWidgetToDashboard(widget) {
        // Normalize component references before handing off to the model.
        const payload = { ...widget };
        if (typeof payload.component === 'function') {
            payload.component = payload.component.name;
        }
        if (payload.component instanceof ExtensionComponent) {
            payload.component = payload.component.toString();
        }

        try {
            yield this.args.dashboard.addWidget(payload);
        } catch (err) {
            this.notifications.serverError(err);
        }
    }

    @action selectTab(key) {
        this.activeTab = key;
    }

    @action onSearch(event) {
        this.searchQuery = event.target.value;
    }

    @action clearSearch() {
        this.searchQuery = '';
    }

    @action onHover(widget) {
        this.hoveredWidget = widget;
    }

    @action onUnhover() {
        this.hoveredWidget = null;
    }

    @action onPressClose() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }
    }
}
