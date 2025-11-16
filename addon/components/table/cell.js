import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class TableCellComponent extends Component {
    @service tableContext;
    @tracked tableCellNode;

    get sortColumn() {
        const column = this.args.column ?? {};
        const sortParam = column.sortParam || column.valuePath;
        const sortColumns = this.tableContext.table?.sortColumns ?? [];
        return sortColumns.find((c) => c.param === sortParam);
    }

    get isAscending() {
        return this.sortColumn?.direction === 'asc';
    }

    get isDescending() {
        return this.sortColumn?.direction === 'desc';
    }

    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
    }

    @action getOwnerTable(tableCellNode) {
        while (tableCellNode) {
            tableCellNode = tableCellNode.parentNode;

            if (tableCellNode.tagName.toLowerCase() === 'table') {
                return tableCellNode;
            }
        }

        return undefined;
    }

    @action triggerSort(event) {
        const { column } = this.args;
        if (column && column.sortable) {
            this.tableContext.table.handleSort(column, event);
        }
    }
}
