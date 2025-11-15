import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutResourceTabularComponent extends Component {
    @service filters;
    @tracked table;
    @tracked columns = [];

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

    @action handleSort(sortBy, sortDirection) {
        const sortValue = sortDirection === 'asc' ? sortBy : `-${sortBy}`;

        if (this.args.controller && this.args.controller.sort) {
            this.args.controller.sort = sortValue;
        }

        if (typeof this.args.onSort === 'function') {
            this.args.onSort({
                sortBy,
                sortDirection,
                sortValue,
            });
        }
    }
}
