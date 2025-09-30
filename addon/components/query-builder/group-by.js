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

        // Use allSelectedColumns from parent if available
        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];

        // For COUNT, we can use any selected column or *
        if (this.selectedAggregateFn.value === 'count') {
            return [{ name: '*', label: 'All Records', type: 'count', full: '*' }, ...columnsToUse];
        }

        // For SUM, AVG, MIN, MAX - only numeric columns from selected columns
        if (['sum', 'avg', 'min', 'max'].includes(this.selectedAggregateFn.value)) {
            return columnsToUse.filter((column) => ['number', 'integer', 'decimal', 'float'].includes(column.type));
        }

        // For GROUP_CONCAT - string columns from selected columns
        if (this.selectedAggregateFn.value === 'group_concat') {
            return columnsToUse.filter((column) => ['string', 'text'].includes(column.type));
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

    @action
    selectGroupBy(column) {
        this.selectedGroupBy = column;
    }

    @action
    selectAggregateFn(fn) {
        this.selectedAggregateFn = fn;
        this.selectedAggregateBy = null; // Reset aggregate column when function changes
    }

    @action
    selectAggregateBy(column) {
        this.selectedAggregateBy = column;
    }

    @action
    addGroupBy() {
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

    @action
    removeGroupBy(index) {
        this.groupByItems = this.groupByItems.filter((_, i) => i !== index);
        this.notifyChange();
    }

    @action
    reorderGroupBy(newOrder) {
        this.groupByItems = newOrder;
        this.notifyChange();
    }

    /**
     * Validate existing group by items when selected columns change
     */
    @action
    validateGroupByItems() {
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
