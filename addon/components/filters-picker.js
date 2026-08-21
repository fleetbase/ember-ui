import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { isArray } from '@ember/array';
import getUrlParam from '../utils/get-url-param';

export default class FiltersPickerComponent extends Component {
    @service router;
    @tracked filters = [];

    // Optional host services; undefined when the host app does not register them.
    get hostRouter() {
        return getOwner(this).lookup('service:hostRouter');
    }

    get events() {
        return getOwner(this).lookup('service:events');
    }

    get activeRouter() {
        /* eslint-disable-next-line ember/no-private-routing-service */
        return this.hostRouter ?? this.router ?? getOwner(this).lookup('router:main');
    }

    get activeFilters() {
        return this.filters.filter((f) => f.isFilterActive);
    }

    get hasFilters() {
        return this.activeFilters.length > 0;
    }

    constructor() {
        super(...arguments);

        this.#rebuildFilters(); // initial state

        // Refresh whenever the route (→ query-params) changes
        this._routeHandler = () => this.#rebuildFilters();
        this.activeRouter?.on?.('routeDidChange', this._routeHandler);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.activeRouter?.off?.('routeDidChange', this._routeHandler);
    }

    /**
     * Re-reads the filter state from the URL. Wired to the dropdown's open/close so the picker
     * reflects the current query params; `#rebuildFilters` is private, and the template used to
     * bind a `this.updateFilters` that did not exist, leaving both handlers undefined.
     *
     * @action
     */
    @action updateFilters() {
        this.#rebuildFilters();
    }

    #readUrlValue(param) {
        const raw = getUrlParam(param); // string | string[] | undefined
        if (isArray(raw)) {
            return raw.length ? raw : undefined;
        }
        return raw === '' ? undefined : raw;
    }

    #rebuildFilters(onColumn) {
        const cols = this.args.columns ?? [];

        this.filters = cols
            .filter((c) => c.filterable)
            .map((column, index) => {
                const param = column.filterParam ?? column.valuePath;
                const value = this.#readUrlValue(param);
                const active = value != null; // null & undefined only

                const filterCol = {
                    ...column,
                    trueIndex: index,
                    param,
                    filterValue: value,
                    isFilterActive: active,
                };

                if (typeof onColumn === 'function') {
                    onColumn(filterCol, index, value);
                }

                return filterCol;
            });

        return this;
    }

    @action applyFilters() {
        // Trigger filter applied event
        if (this.events) {
            this.events.trackEvent('ui.filter.applied', this.activeFilters);
        }

        if (typeof this.args.onApply === 'function') {
            this.args.onApply();
        }
    }

    @action updateFilterValue({ param }, value) {
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(param, value);
        }
    }

    @action clearFilterValue({ param }) {
        if (typeof this.args.onFilterClear === 'function') {
            this.args.onFilterClear(param);
        }
    }

    @action async clearFilters(...args) {
        // Trigger filter cleared event
        if (this.events) {
            this.events.trackEvent('ui.filter.cleared');
        }

        if (typeof this.args.onClear === 'function') {
            this.args.onClear(...args);
        }

        // Build a qp bag that explicitly clears the filter params
        const router = this.activeRouter;
        const qp = { ...router.currentRoute.queryParams };

        (this.args.columns ?? [])
            .filter((c) => c.filterable)
            .forEach((c) => {
                const key = c.filterParam ?? c.valuePath;

                // Explicitly clear them instead of deleting
                if (key in qp) {
                    qp[key] = null; // will remove from URL if default is null
                }

                const arrayKey = `${key}[]`;
                if (arrayKey in qp) {
                    qp[arrayKey] = null;
                }
            });

        try {
            await router.transitionTo(router.currentRouteName, {
                queryParams: qp,
            });
        } catch (error) {
            /* istanbul ignore next -- reachable in production (any non-abort transition failure)
               but not from this suite: `clearFilters` is async, so the rethrow surfaces as an
               unhandled rejection, which QUnit reports as a global failure. Neither a try/catch
               around the click nor `setupOnerror` intercepts it, and suppressing the report would
               pin nothing useful. */
            if (error?.name !== 'TransitionAborted') {
                throw error;
            }
        }
    }
}
