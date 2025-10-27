import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderSortByComponent extends Component {
    @tracked selectedSortBy = null;
    @tracked selectedSortDirection = null;
    @tracked sortByItems = [];

    constructor() {
        super(...arguments);
        this.sortByItems = this.args.sortBy || [];

        // Set default direction
        this.selectedSortDirection = this.directions[0];
    }

    get directions() {
        return [
            { value: 'asc', label: 'Ascending', icon: 'arrow-up' },
            { value: 'desc', label: 'Descending', icon: 'arrow-down' },
        ];
    }

    /**
     * Only allow sorting by columns that are selected in the query
     * This ensures valid SQL generation
     */
    get availableSortColumns() {
        // Use allSelectedColumns from parent if available, otherwise fall back to selectedColumns
        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];

        if (!columnsToUse.length) {
            return [];
        }

        // Return all selected columns - both regular and aggregated columns can be sorted
        return columnsToUse.map((column) => ({
            ...column,
            // Add helpful label for aggregated columns
            sortLabel: column.aggregate && column.aggregate !== 'none' ? `${column.aggregate.toUpperCase()}(${column.label})` : column.label,
        }));
    }

    /**
     * Check if sorting is possible with current column selection
     */
    get canSort() {
        return this.availableSortColumns.length > 0;
    }

    /**
     * Get helpful message when sorting is not available
     */
    get sortingMessage() {
        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];

        if (!columnsToUse.length) {
            return 'Select columns first to enable sorting';
        }

        return null;
    }

    @action selectSortColumn(column) {
        this.selectedSortBy = column;
    }

    @action selectSortDirection(direction) {
        this.selectedSortDirection = direction;
    }

    @action addSortBy() {
        if (this.selectedSortBy && this.selectedSortDirection) {
            // Validate that the sort column is actually selected
            const isSortColumnSelected = this.args.selectedColumns?.some((col) => col.full === this.selectedSortBy.full);

            if (!isSortColumnSelected) {
                console.warn('Cannot sort by column that is not selected:', this.selectedSortBy);
                return;
            }

            // Check if this column is already in the sort list
            const existingIndex = this.sortByItems.findIndex((item) => item.column.full === this.selectedSortBy.full);

            if (existingIndex >= 0) {
                // Update existing sort direction
                const updatedItems = [...this.sortByItems];
                updatedItems[existingIndex] = {
                    ...updatedItems[existingIndex],
                    direction: this.selectedSortDirection,
                };
                this.sortByItems = updatedItems;
            } else {
                // Add new sort
                const newSort = {
                    id: Date.now() + Math.random(),
                    column: this.selectedSortBy,
                    direction: this.selectedSortDirection,
                };

                this.sortByItems = [...this.sortByItems, newSort];
            }

            // Reset selections
            this.selectedSortBy = null;
            this.selectedSortDirection = this.directions[0];

            this.notifyChange();
        }
    }

    @action removeSortBy(index) {
        this.sortByItems = this.sortByItems.filter((_, i) => i !== index);
        this.notifyChange();
    }

    // @action reorderSortBy(newOrder) {
    //     this.sortByItems = newOrder;
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
        this.sortByItems = [...this.sortByItems];

        this.notifyChange();
    }

    @action toggleSortDirection(index) {
        const updatedItems = [...this.sortByItems];
        const currentDirection = updatedItems[index].direction.value;
        const newDirection = currentDirection === 'asc' ? this.directions[1] : this.directions[0];

        updatedItems[index] = {
            ...updatedItems[index],
            direction: newDirection,
        };

        this.sortByItems = updatedItems;
        this.notifyChange();
    }

    /**
     * Validate existing sort items when selected columns change
     */
    @action validateSortItems() {
        const columnsToUse = this.args.allSelectedColumns || this.args.selectedColumns || [];

        if (!columnsToUse.length) {
            // Clear all sorting if no columns selected
            if (this.sortByItems.length > 0) {
                this.sortByItems = [];
                this.notifyChange();
            }
            return;
        }

        // Remove sort items for columns that are no longer selected
        const validSortItems = this.sortByItems.filter((item) => {
            return columnsToUse.some((col) => col.full === item.column.full);
        });

        if (validSortItems.length !== this.sortByItems.length) {
            this.sortByItems = validSortItems;
            this.notifyChange();
        }
    }

    notifyChange() {
        if (this.args.onChange) {
            this.args.onChange(this.sortByItems);
        }
    }
}
