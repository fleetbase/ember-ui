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

    // `Th` resolves the direction through `table.getSortColumn(param)` and passes it down; it
    // always sends a boolean, so honour a truthy one and otherwise fall back to the local
    // `sortColumns` computation. That covers a table implementing only `getSortColumn`, a table
    // populating only `sortColumns`, and body cells, which get no argument at all.
    get isAscending() {
        return this.args.isAscending || this.sortColumn?.direction === 'asc';
    }

    get isDescending() {
        return this.args.isDescending || this.sortColumn?.direction === 'desc';
    }

    @action setupComponent(tableCellNode) {
        this.tableCellNode = tableCellNode;
    }

    @action triggerSort(event) {
        const { column } = this.args;
        if (column && column.sortable) {
            this.tableContext.table.handleSort(column, event);
        }
    }
}
