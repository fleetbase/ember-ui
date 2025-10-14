import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ReportBuilderResultsTableComponent extends Component {
    get data() {
        return this.args.data ?? [];
    }

    get columns() {
        return this.args.columns ?? [];
    }

    get isRunning() {
        return Boolean(this.args.isRunning);
    }

    get error() {
        return this.args.error;
    }

    get pagination() {
        return this.args.pagination ?? { page: 1, limit: 100, total: this.data.length };
    }

    @action sortBy(colName) {
        this.args.onSort?.(colName);
    }
}
