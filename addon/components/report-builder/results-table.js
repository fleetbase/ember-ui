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

    /**
     * `Pagination` speaks `@meta` + `@currentPage`, not the `{ page, limit, total }` shape the
     * report builder passes around. Translate rather than handing it arguments it ignores.
     */
    get paginationMeta() {
        const { page, limit, total } = this.pagination;
        const lastPage = limit > 0 ? Math.ceil(total / limit) : 1;
        const from = total === 0 ? 0 : (page - 1) * limit + 1;

        return {
            current_page: page,
            last_page: lastPage,
            from,
            to: Math.min(page * limit, total),
            total,
        };
    }

    @action sortBy(colName) {
        this.args.onSort?.(colName);
    }
}
