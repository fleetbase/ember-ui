import Component from '@glimmer/component';
import { get, set, action } from '@ember/object';
import { alias, filter, gt, map } from '@ember/object/computed';
import { isArray } from '@ember/array';
import getUrlParam from '../utils/get-url-param';
import removeUrlParam from '../utils/remove-url-param';

export default class FiltersPickerComponent extends Component {
    /**
     * Alias of columns passed from args.
     *
     * @memberof FiltersPickerComponent
     */
    @alias('args.columns') columns;

    /**
     * Filters which are active and should be applied.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('filters', (filter) => filter.isFilterActive === true) activeFilters;

    /**
     * Computed property that determines if any filters are set.
     *
     * @memberof FiltersPickerComponent
     */
    @gt('activeFilters.length', 0) hasFilters;

    /**
     * Map in filters suited for FiltersPickerComponent.
     *
     * @memberof FiltersPickerComponent
     */
    @map('columns.@each.{isFilterActive,filterable}', (column, trueIndex) => {
        column = { ...column, trueIndex };

        // get the active param if any
        let activeParam = getUrlParam(column.filterParam ?? column.valuePath);

        // for params which filter as array or multi option use key like `param[]`
        if (column.filterComponent === 'filter/multi-option' && !activeParam) {
            activeParam = getUrlParam(`${column.filterParam ?? column.valuePath}[]`);
        }

        // if filter is active
        if (activeParam) {
            column.isFilterActive = true;

            // if active param is empty array switch to false
            if (isArray(activeParam) && activeParam.length === 0) {
                column.isFilterActive = false;
            }

            column.filterValue = activeParam;
        }

        return column;
    })
    filters;

    /**
     * Get the filterable filters.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('filters', (filter) => typeof filter.filterComponent === 'string') filterComponents;

    /**
     * Get the filterable filters.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('filters', (filter) => filter.filterable) filterableFilters;

    /**
     * Activates an individual filter
     *
     * @param {Integer} index the index of the filter in columns
     * @param {Event} event the onchange event from the checkbox
     * @memberof FiltersPickerComponent
     *
     * @void
     */
    @action activateFilter(column, event) {
        // alias `isFilterActive`
        const isFilterActive = event.target.checked;

        // set the checked status for filter
        this.columns[column.trueIndex].isFilterActive = isFilterActive;

        // if deactivating filter remove queryParam
        if (!isFilterActive) {
            removeUrlParam(column.filterParam ?? column.valuePath);
            removeUrlParam(`${column.filterParam ?? column.valuePath}[]`);
        }
    }

    /**
     * Activates an individual filter
     *
     * @param {Integer} index the index of the filter in columns
     * @param {Event} event the onchange event from the checkbox
     * @memberof FiltersPickerComponent
     *
     * @void
     */
    @action updateColumnFilterValue(column, value) {
        console.log("updateColumnFilterValue()", ...arguments);
        this.columns[column.trueIndex].filterValue = value;

        if (value) {
            this.columns[column.trueIndex].isFilterActive = true;
        }
    }

    /**
     * Clears all filters
     *
     * @memberof FiltersPickerComponent
     * @void
     */
    @action clearFilters() {
        const { onChange } = this.args;

        // set the state that the filters are being cleared
        this.isClearingFilters = true;

        // remove urlSearchParams if any
        this.columns.forEach((column) => {
            removeUrlParam(column.filterParam ?? column.valuePath);
            removeUrlParam(`${column.filterParam ?? column.valuePath}[]`);
        });

        // clear all columns
        const clearedColumns = this.columns.map((column) => {
            column.isFilterActive = false;
            column.filterValue = undefined;
            return column;
        });

        // set cleared columns
        set(this, 'columns', clearedColumns);

        // trigger events
        if (typeof onChange === 'function') {
            onChange(this.columns);
        }
    }

    /**
     * Hook to apply active filters to the controller
     *
     * @memberof FiltersPickerComponent
     * @void
     */
    @action applyFilters() {
        const { onChange } = this.args;

        // handle users callback
        if (typeof onChange === 'function') {
            onChange(this.columns);
        }
    }
}
