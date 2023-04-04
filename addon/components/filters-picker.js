import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { set, action } from '@ember/object';
import { alias, filter, gt, map } from '@ember/object/computed';
import { isArray } from '@ember/array';
import getUrlParam from '../utils/get-url-param';

export default class FiltersPickerComponent extends Component {
    @service hostRouter;

    /**
     * Alias for columns argument.
     *
     * @memberof FiltersPickerComponent
     */
    @alias('args.columns') columns;

    /**
     * Filters which are active and should be applied.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('columns.@each.isFilterActive', (filter) => filter.isFilterActive === true) activeFilters;

    /**
     * Computed property that determines if any filters are set.
     *
     * @memberof FiltersPickerComponent
     */
    @gt('activeFilters.length', 0) hasFilters;

    /**
     * Filters which are active and should be applied.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('columns.@each.filterable', (filter) => filter.filterable) filterables;

    /**
     * Map in filters suited for FiltersPickerComponent.
     *
     * @memberof FiltersPickerComponent
     */
    @map('filterables.@each.{filterValue,isFilterActive}', function (column, trueIndex) {
        // add true index to column
        column = { ...column, trueIndex };

        // get the url param key
        const paramKey = column.filterParam ?? column.valuePath;

        // get the active param if any and update filter
        const activeParam = getUrlParam(column);

        // update if an activeParam exists
        if (activeParam) {
            column.isFilterActive = true;

            if (isArray(activeParam) && activeParam.length === 0) {
                column.isFilterActive = false;
            }

            column.filterValue = activeParam;
        }

        return column;
    })
    filters;

    @action clearFilters() {
        const { onClear, columns } = this.args;

        const currentRouteName = this.hostRouter.currentRouteName;
        const currentQueryParams = { ...this.hostRouter.currentRoute.queryParams };

        columns.forEach((column) => {
            if (!column.filterable) return;

            const paramKey = column.filterParam ?? column.valuePath;
            delete currentQueryParams[paramKey];
            delete currentQueryParams[`${paramKey}[]`];

            // reset column values
            set(column, 'filterValue', undefined);
            set(column, 'isFilterActive', false);
        });

        // transition to cleared params with router service
        this.hostRouter.transitionTo(currentRouteName, { queryParams: currentQueryParams });

        // run `onClear()` callback
        if (typeof onClear === 'function') {
            onClear();
        }
    }
}
