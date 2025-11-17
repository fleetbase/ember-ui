import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { filter, alias } from '@ember/object/computed';
import { isEqual } from '@fleetbase/ember-core/decorators/is-equal';

export default class TableComponent extends Component {
    @service tableContext;
    @tracked tableNode;
    @tracked allRowsToggled = false;
    @tracked sortColumns = [];
    @alias('args.rows') rows;
    @alias('args.columns') columns;
    @filter('args.columns.@each.hidden', (column) => !column.hidden) visibleColumns;
    @filter('args.rows.@each.checked', (row) => row.checked) selectedRows;
    @isEqual('selectedRows.length', 'rows.length') allRowsSelected;

    constructor() {
        super(...arguments);
        // Initialize sort columns from args if provided
        this.initializeSortColumns();
    }

    initializeSortColumns() {
        const { sortBy, sortOrder } = this.args;

        if (sortBy) {
            // Parse comma-delimited sort string if provided
            if (typeof sortBy === 'string' && sortBy.includes(',')) {
                this.sortColumns = this.parseSortString(sortBy);
            } else if (typeof sortBy === 'string') {
                // Single sort column
                const direction = sortBy.startsWith('-') ? 'desc' : sortOrder || 'asc';
                const param = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
                this.sortColumns = [{ param, direction }];
            }
        }
    }

    parseSortString(sortString) {
        return sortString.split(',').map((part) => {
            const trimmed = part.trim();
            if (trimmed.startsWith('-')) {
                return { param: trimmed.substring(1), direction: 'desc' };
            }
            return { param: trimmed, direction: 'asc' };
        });
    }

    buildSortString() {
        return this.sortColumns
            .map((col) => {
                return col.direction === 'desc' ? `-${col.param}` : col.param;
            })
            .join(',');
    }

    getSortColumn(param) {
        return this.sortColumns.find((col) => col.param === param);
    }

    getSortPriority(param) {
        const index = this.sortColumns.findIndex((col) => col.param === param);
        return index >= 0 ? index + 1 : null;
    }

    @action setupComponent(tableNode) {
        const { onSetup } = this.args;

        this.tableNode = tableNode;
        this.tableContext.node = tableNode;
        this.tableContext.table = this;

        // Delay sticky offset calculation to ensure DOM is fully rendered
        later(
            this,
            () => {
                this.calculateStickyOffsets();
                this.setupScrollListener();
            },
            50
        );

        later(
            this,
            () => {
                if (typeof onSetup === 'function') {
                    onSetup(this, tableNode);
                }
            },
            100
        );
    }

    @action setupScrollListener() {
        // Find the scrollable wrapper
        const wrapper = this.tableNode?.closest('.next-table-wrapper');
        if (!wrapper) return;

        // Add scroll event listener to toggle shadow visibility
        wrapper.addEventListener('scroll', () => {
            this.updateStickyShadows(wrapper);
        });

        // Initial check
        this.updateStickyShadows(wrapper);
    }

    updateStickyShadows(wrapper) {
        const scrollLeft = wrapper.scrollLeft;
        const scrollWidth = wrapper.scrollWidth;
        const clientWidth = wrapper.clientWidth;
        const maxScrollLeft = scrollWidth - clientWidth;

        // Check if scrolled to the start (hide left shadows)
        const isAtStart = scrollLeft <= 1;
        // Check if scrolled to the end (hide right shadows)
        const isAtEnd = scrollLeft >= maxScrollLeft - 1;

        // Update left sticky columns
        const leftStickyColumns = wrapper.querySelectorAll('.sticky-left');
        leftStickyColumns.forEach((cell) => {
            if (isAtStart) {
                cell.classList.add('at-natural-position');
            } else {
                cell.classList.remove('at-natural-position');
            }
        });

        // Update right sticky columns
        const rightStickyColumns = wrapper.querySelectorAll('.sticky-right');
        rightStickyColumns.forEach((cell) => {
            if (isAtEnd) {
                cell.classList.add('at-natural-position');
            } else {
                cell.classList.remove('at-natural-position');
            }
        });
    }

    @action calculateStickyOffsets() {
        if (!this.tableNode || !this.visibleColumns) {
            return;
        }

        // Calculate left offsets for left-sticky columns
        let leftOffset = 0;

        // Account for checkbox column if it's sticky
        if (this.args.checkboxSticky) {
            // Find checkbox column (first th without data-column-id)
            const allThs = this.tableNode?.querySelectorAll('thead th');
            const checkboxTh = allThs?.[0];

            if (checkboxTh && !checkboxTh.hasAttribute('data-column-id')) {
                // This is the checkbox column - get its actual width
                const width = checkboxTh.offsetWidth || this.args.selectAllColumnWidth || 40;
                leftOffset += width;
            }
        }

        const leftStickyColumns = this.visibleColumns.filter((col) => col.sticky === true || col.sticky === 'left');

        leftStickyColumns.forEach((column) => {
            column._stickyOffset = leftOffset;
            column._stickyPosition = 'left';
            column._stickyZIndex = 15;

            // Get column width from DOM if available
            const th = this.tableNode?.querySelector(`th[data-column-id="${column.valuePath}"]`);
            if (th) {
                leftOffset += th.offsetWidth;
            } else {
                // Fallback to column width property or default
                leftOffset += column.width || 150;
            }
        });

        // Calculate right offsets for right-sticky columns
        let rightOffset = 0;
        const rightStickyColumns = this.visibleColumns.filter((col) => col.sticky === 'right').reverse();

        rightStickyColumns.forEach((column) => {
            column._stickyOffset = rightOffset;
            column._stickyPosition = 'right';
            column._stickyZIndex = 15;

            // Get column width from DOM if available
            const th = this.tableNode?.querySelector(`th[data-column-id="${column.valuePath}"]`);
            if (th) {
                const width = th.offsetWidth;
                rightOffset += width;
            } else {
                // Fallback to column width property or default
                rightOffset += column.width || 150;
            }
        });

        // Note: visibleColumns is a computed property and doesn't need manual reactivity triggering
        // The column objects are mutated directly with _sticky* properties

        // Update all sticky cells with the calculated offsets
        this.updateStickyCellStyles();
    }

    @action updateStickyCellStyles() {
        if (!this.tableNode) {
            return;
        }

        // Update header cells
        const allThs = this.tableNode.querySelectorAll('thead th');
        allThs.forEach((th) => {
            const columnId = th.getAttribute('data-column-id');

            if (th.classList.contains('is-sticky')) {
                // CRITICAL: Always ensure top: 0 for vertical stickiness
                th.style.top = '0';

                if (!columnId) {
                    // Checkbox column - always at left: 0
                    th.style.left = '0px';
                } else {
                    // Find the column object
                    const column = this.visibleColumns.find((c) => c.valuePath === columnId);
                    if (column && column._stickyOffset !== undefined) {
                        const position = column._stickyPosition || 'left';
                        const offset = column._stickyOffset;
                        th.style[position] = `${offset}px`;
                    }
                }
            }
        });

        // Update body cells
        const allTds = this.tableNode.querySelectorAll('tbody td');
        allTds.forEach((td) => {
            const columnId = td.getAttribute('data-column-id');

            if (td.classList.contains('is-sticky')) {
                if (!columnId) {
                    // Checkbox column - always at left: 0
                    td.style.left = '0px';
                } else {
                    // Find the column object
                    const column = this.visibleColumns.find((c) => c.valuePath === columnId);
                    if (column && column._stickyOffset !== undefined) {
                        const position = column._stickyPosition || 'left';
                        const offset = column._stickyOffset;
                        td.style[position] = `${offset}px`;
                    }
                }
            }
        });
    }

    @action onColumnResize() {
        // Recalculate sticky offsets when columns are resized
        later(
            this,
            () => {
                this.calculateStickyOffsets();
            },
            50
        );
    }

    @action addRow(row) {
        if (isArray(row)) {
            return this.addRows(row);
        }

        this.rows.pushObject(row);
        return this;
    }

    @action addRows(rows = []) {
        this.rows.pushObjects(rows);
        return this;
    }

    @action removeRow(row) {
        if (isArray(row)) {
            return this.removeRows(row);
        }

        this.rows.removeObject(row);
        return this.resetRowCheckboxes();
    }

    @action removeRows(rows = []) {
        this.rows.removeObjects(rows);
        return this.resetRowCheckboxes();
    }

    @action resetRowCheckboxes() {
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', row.checked === true);
        }

        return this;
    }

    @action selectAllRows() {
        this.allRowsToggled = !this.allRowsToggled;

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', this.allRowsToggled);
        }
    }

    @action untoggleAllRows() {
        this.untoggleSelectAll();

        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows.objectAt(i);
            set(row, 'checked', false);
        }
    }

    @action untoggleSelected() {
        this.untoggleSelectAll();

        for (let i = 0; i < this.selectedRows.length; i++) {
            const row = this.selectedRows.objectAt(i);
            set(row, 'checked', false);
        }
    }

    @action untoggleSelectAll() {
        this.allRowsToggled = false;
    }

    @action toggleSelectAll() {
        this.allRowsToggled = true;
    }

    getSelectedIds() {
        return this.selectedRows.map((_) => _.id);
    }

    @action handleSort(column, event) {
        if (!column.sortable) {
            return;
        }

        const sortParam = column.sortParam || column.valuePath;
        const isMultiSort = event?.shiftKey || false;

        // Find existing sort for this column
        const existingIndex = this.sortColumns.findIndex((col) => col.param === sortParam);

        if (isMultiSort) {
            // Multi-column sort mode (Shift+Click)
            if (existingIndex >= 0) {
                // Column already sorted - toggle direction or remove
                const currentSort = this.sortColumns[existingIndex];
                if (currentSort.direction === 'asc') {
                    // Change to descending
                    this.sortColumns[existingIndex] = { param: sortParam, direction: 'desc' };
                } else {
                    // Remove from sort
                    this.sortColumns.splice(existingIndex, 1);
                }
            } else {
                // Add new sort column
                this.sortColumns.push({ param: sortParam, direction: 'asc' });
            }
        } else {
            // Single column sort mode (Regular Click)
            if (existingIndex >= 0 && this.sortColumns.length === 1) {
                // Only this column is sorted - toggle direction
                const currentSort = this.sortColumns[0];
                if (currentSort.direction === 'asc') {
                    this.sortColumns = [{ param: sortParam, direction: 'desc' }];
                } else {
                    // Remove sort
                    this.sortColumns = [];
                }
            } else {
                // Replace all sorts with this column
                this.sortColumns = [{ param: sortParam, direction: 'asc' }];
            }
        }

        // Trigger reactivity
        this.sortColumns = [...this.sortColumns];

        // Build sort string and call callback
        const sortString = this.buildSortString();

        if (typeof this.args.onSort === 'function') {
            this.args.onSort(sortString, this.sortColumns);
        }
    }
}
