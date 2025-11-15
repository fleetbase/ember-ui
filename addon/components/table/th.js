import TableCellComponent from './cell';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class TableThComponent extends TableCellComponent {
    @service tableContext;

    get isSorted() {
        const { column } = this.args;
        if (!column) {
            return false;
        }
        const sortParam = column.sortParam || column.valuePath;
        return this.tableContext.table.sortBy === sortParam;
    }

    get isAscending() {
        return this.isSorted && this.tableContext.table.sortOrder === 'asc';
    }

    get isDescending() {
        return this.isSorted && this.tableContext.table.sortOrder === 'desc';
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

    @action onClick() {
        const { column } = this.args;
        if (column && column.sortable) {
            this.tableContext.table.handleSort(column);
        }
    }
}
