import TableCellComponent from './cell';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class TableThComponent extends TableCellComponent {
    @service tableContext;

    get sortColumn() {
        const { column } = this.args;
        if (!column) {
            return null;
        }
        const sortParam = column.sortParam || column.valuePath;
        return this.tableContext.table?.getSortColumn(sortParam);
    }

    get isSorted() {
        return this.sortColumn !== null && this.sortColumn !== undefined;
    }

    get isAscending() {
        return this.isSorted && this.sortColumn.direction === 'asc';
    }

    get isDescending() {
        return this.isSorted && this.sortColumn.direction === 'desc';
    }

    get sortPriority() {
        const { column } = this.args;
        if (!column) {
            return null;
        }
        const sortParam = column.sortParam || column.valuePath;
        return this.tableContext.table?.getSortPriority(sortParam);
    }

    get showSortPriority() {
        return this.isSorted && this.sortPriority > 1;
    }

    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
        this.setupTableCellNode(tableCellNode);
    }

    @action setupTableCellNode(tableCellNode) {
        const { column, width } = this.args;

        if (column?.width) {
            tableCellNode.style.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
        }

        if (width) {
            tableCellNode.style.width = typeof width === 'number' ? `${width}px` : width;
        }
    }

    @action onClick(event) {
        const { column } = this.args;
        if (column && column.sortable) {
            this.tableContext.table.handleSort(column, event);
        }
    }
}
