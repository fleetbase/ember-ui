import Component from '@glimmer/component';
import { tracked, cached } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isNone } from '@ember/utils';
import { getOwner } from '@ember/application';
import lookupResourceView, { mergeHeaderButtons } from '../../../utils/resource-view';

/**
 * A key that survives the column objects being rebuilt, so a column the
 * user hid stays hidden when the columns are recomputed.
 */
export function columnKey(column) {
    return column?.id ?? column?.valuePath ?? column?.label;
}

export default class LayoutResourceTabularComponent extends Component {
    @service filters;
    @tracked table;

    /**
     * What the column picker set, by column key. Applied over the columns on
     * every recompute rather than kept on the column objects, which a
     * controller getter may rebuild.
     */
    @tracked columnVisibility = {};

    get resourceView() {
        return lookupResourceView(getOwner(this));
    }

    /**
     * What registered handlers receive as their context. `table` is a getter:
     * the table is only set up after the first render.
     */
    get viewContext() {
        const component = this;
        return {
            controller: this.args.controller,
            get table() {
                return component.table;
            },
            getSelectedRows: () => component.table?.selectedRows ?? [],
        };
    }

    /**
     * `@columns` with anything registered under `@registry` merged in, and the
     * column picker's choices applied.
     */
    @cached get columns() {
        let columns = this.args.columns ?? [];
        const { resourceView } = this;
        const { registry } = this.args;

        if (resourceView && registry) {
            columns = resourceView.mergeSlot(registry, 'columns', columns, this.viewContext);
            columns = resourceView.mergeRowActions(registry, columns, this.viewContext);
        }

        const visibility = this.columnVisibility;
        for (const column of columns) {
            const key = columnKey(column);
            if (column && key in visibility && column.hidden !== visibility[key]) {
                column.hidden = visibility[key];
            }
        }

        return columns;
    }

    get actionButtons() {
        return mergeHeaderButtons(this.resourceView, this.args.registry, this.args.actionButtons, this.viewContext);
    }

    get bulkActions() {
        const { resourceView } = this;
        const { registry, bulkActions } = this.args;
        return resourceView && registry ? resourceView.mergeSlot(registry, 'bulk-actions', bulkActions ?? [], this.viewContext) : bulkActions;
    }

    get checkboxSticky() {
        if (!isNone(this.args.checkboxSticky)) return this.args.checkboxSticky;

        return this.columns.some((c) => !isNone(c?.sticky));
    }

    @action setColumns(columns) {
        const visibility = { ...this.columnVisibility };
        for (const column of columns ?? []) {
            visibility[columnKey(column)] = Boolean(column?.hidden);
        }
        this.columnVisibility = visibility;
    }

    @action setupTable(table) {
        this.table = table;
        if (typeof this.args.setupTable === 'function') {
            this.args.setupTable(table);
        }
    }

    @action handleSort(sortString, sortColumns) {
        // sortString is comma-delimited format: "created_at,-order_date,status"
        // sortColumns is array format: [{ param: 'created_at', direction: 'asc' }, ...]

        if (this.args.controller && this.args.controller.sort !== undefined) {
            this.args.controller.sort = sortString;
        }

        if (typeof this.args.onSort === 'function') {
            this.args.onSort({
                sortString,
                sortColumns,
                // Legacy support for single column callbacks
                sortBy: sortColumns.length > 0 ? sortColumns[0].param : null,
                sortDirection: sortColumns.length > 0 ? sortColumns[0].direction : null,
                sortValue: sortString,
            });
        }
    }
}
