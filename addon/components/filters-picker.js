import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import getUrlParam from '../utils/get-url-param';

export default class FiltersPickerComponent extends Component {
    @service hostRouter;
    @tracked filters = [];

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
        this.hostRouter.on('routeDidChange', this._routeHandler);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.hostRouter.off('routeDidChange', this._routeHandler);
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
        if (typeof this.args.onClear === 'function') {
            this.args.onClear(...args);
        }

        // Build a qp bag that explicitly clears the filter params
        const qp = { ...this.hostRouter.currentRoute.queryParams };

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
            await this.hostRouter.transitionTo(this.hostRouter.currentRouteName, {
                queryParams: qp,
            });
        } catch (error) {
            if (error?.name !== 'TransitionAborted') {
                throw error;
            }
        }
    }
}
