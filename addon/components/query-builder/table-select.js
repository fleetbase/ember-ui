import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QueryBuilderTableSelectComponent extends Component {
    @tracked primaryTable;

    constructor() {
        super(...arguments);
        this.primaryTable = this.args.table ?? null;
    }

    @action selectPrimaryTable(table) {
        this.primaryTable = table;
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(table);
        }
    }
}
