import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderGroupByComponent extends Component {
    @tracked selectedGroupBy = null;
    @tracked selectedAggregateFn = null;
    @tracked selectedAggregateBy = null;
    @tracked groupByItems = [];

    constructor() {
        super(...arguments);
        this.groupByItems = this.args.groupBy || [];
    }

    get aggregateFunctions() {
        return [
            { value: 'count', label: 'Count', icon: 'hashtag' },
            { value: 'sum', label: 'Sum', icon: 'plus' },
            { value: 'avg', label: 'Average', icon: 'chart-line' },
            { value: 'min', label: 'Minimum', icon: 'arrow-down' },
            { value: 'max', label: 'Maximum', icon: 'arrow-up' },
            { value: 'group_concat', label: 'Concatenate', icon: 'link' },
        ];
    }

    /**
     * Only allow grouping by columns that are selected in the query
     * This ensures valid SQL generation
     */
    get availableGroupByColumns() {
        // Use allSelectedColumns from parent if available, otherwise fall back to selectedColumns
        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];

        if (!columnsToUse.length) {
            return [];
        }

        // Filter to only show selected columns that are not aggregated
        return columnsToUse.filter((column) => {
            // Don't allow grouping by columns that are already aggregated
            const isAggregated = column.aggregate && column.aggregate !== 'none';
            return !isAggregated;
        });
    }

    /**
     * Get columns available for aggregation based on the selected aggregate function
     */
    get availableAggregateColumns() {
        if (!this.selectedAggregateFn) return [];

        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];
        const fn = this.selectedAggregateFn.value;

        if (fn === 'count') {
            return [{ name: '*', label: 'All Records', type: 'count', full: '*' }, ...columnsToUse];
        }

        if (fn === 'sum' || fn === 'avg') {
            // numeric only
            return columnsToUse.filter((c) => ['integer', 'decimal', 'number', 'float'].includes(c.type));
        }

        if (fn === 'min' || fn === 'max') {
            // numeric + datetime + date + string
            return columnsToUse.filter((c) => ['integer', 'decimal', 'number', 'float', 'date', 'datetime', 'timestamp', 'string', 'text'].includes(c.type));
        }

        if (fn === 'group_concat') {
            return columnsToUse.filter((c) => ['string', 'text'].includes(c.type));
        }

        return columnsToUse;
    }

    /**
     * Check if grouping is possible with current column selection
     */
    get canGroup() {
        return this.availableGroupByColumns.length > 0;
    }

    /**
     * Get helpful message when grouping is not available
     */
    get groupingMessage() {
        if (!this.args.selectedColumns?.length) {
            return 'Select columns first to enable grouping';
        }

        if (!this.canGroup) {
            return 'No non-aggregated columns available for grouping';
        }

        return null;
    }

    get isAddGroupingDisabled() {
        const hasGroupBy = !!this.selectedGroupBy;
        const fn = this.selectedAggregateFn?.value;
        const hasFn = !!fn;
        const hasBy = !!this.selectedAggregateBy;

        if (!hasGroupBy || !hasFn) {
            return true;
        }

        // COUNT requires a selection: either "*" or a column (you can auto-select "*" elsewhere)
        if (fn === 'count') {
            return !hasBy;
        }

        // For SUM/AVG/MIN/MAX/GROUP_CONCAT we need:
        // - at least one compatible column available
        // - a selected "aggregate by" column
        const avail = this.availableAggregateColumns ?? [];
        const hasCompatible = avail.length > 0;

        return !(hasCompatible && hasBy);
    }

    @action selectGroupBy(column) {
        this.selectedGroupBy = column;
    }

    @action selectAggregateFn(fn) {
        this.selectedAggregateFn = fn;
        // Optional UX: auto-select "*" when choosing COUNT
        if (fn?.value === 'count') {
            this.selectedAggregateBy = { name: '*', label: 'All Records', type: 'count', full: '*' };
        } else {
            this.selectedAggregateBy = null;
        }
    }

    @action selectAggregateBy(column) {
        this.selectedAggregateBy = column;
    }

    @action addGroupBy() {
        if (this.selectedGroupBy && this.selectedAggregateFn && this.selectedAggregateBy) {
            // Validate that the groupBy column is actually selected
            const isGroupByColumnSelected = this.args.selectedColumns?.some((col) => col.full === this.selectedGroupBy.full);

            if (!isGroupByColumnSelected) {
                console.warn('Cannot group by column that is not selected:', this.selectedGroupBy);
                return;
            }

            const newGroupBy = {
                id: Date.now() + Math.random(),
                groupBy: this.selectedGroupBy,
                aggregateFn: this.selectedAggregateFn,
                aggregateBy: this.selectedAggregateBy,
            };

            this.groupByItems = [...this.groupByItems, newGroupBy];

            // Reset selections
            this.selectedGroupBy = null;
            this.selectedAggregateFn = null;
            this.selectedAggregateBy = null;

            this.notifyChange();
        }
    }

    @action removeGroupBy(index) {
        this.groupByItems = this.groupByItems.filter((_, i) => i !== index);
        this.notifyChange();
    }

    // @action reorderGroupBy(newOrder) {
    //     this.groupByItems = newOrder;
    //     this.notifyChange();
    // }

    @action reorderGroupBy({ sourceList, sourceIndex, targetList, targetIndex }) {
        // no change? bail
        if (sourceList === targetList && sourceIndex === targetIndex) return;

        // mutate the EmberArray in-place (per README)
        const item = sourceList.objectAt(sourceIndex);
        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);

        // ensure Glimmer sees a change even if it misses EmberArray observers
        this.groupByItems = [...this.groupByItems];

        this.notifyChange();
    }

    /**
     * Validate existing group by items when selected columns change
     */
    @action validateGroupByItems() {
        if (!this.args.selectedColumns?.length) {
            // Clear all grouping if no columns selected
            if (this.groupByItems.length > 0) {
                this.groupByItems = [];
                this.notifyChange();
            }
            return;
        }

        // Remove group by items for columns that are no longer selected
        const validGroupByItems = this.groupByItems.filter((item) => {
            return this.args.selectedColumns.some((col) => col.full === item.groupBy.full);
        });

        if (validGroupByItems.length !== this.groupByItems.length) {
            this.groupByItems = validGroupByItems;
            this.notifyChange();
        }
    }

    notifyChange() {
        if (this.args.onChange) {
            this.args.onChange(this.groupByItems);
        }
    }
}
