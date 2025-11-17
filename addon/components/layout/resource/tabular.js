import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isNone } from '@ember/utils';

export default class LayoutResourceTabularComponent extends Component {
    @service filters;
    @tracked table;
    @tracked columns = [];

    get checkboxSticky() {
        if (!isNone(this.args.checkboxSticky)) return this.args.checkboxSticky;

        const columns = this.args.columns ?? this.columns;
        return columns.some((c) => !isNone(c?.sticky));
    }

    constructor(owner, { columns = [] }) {
        super(...arguments);
        this.columns = columns;
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
