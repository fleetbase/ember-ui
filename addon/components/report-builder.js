import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import removeNullish from '../utils/remove-nullish';

export default class ReportBuilderComponent extends Component {
    @service fetch;
    @service notifications;
    @tracked queryConfig = {};
    @tracked schema = {};
    @tracked tabContext;
    @tracked result;
    @tracked tables = [];
    @tracked validationErrors = [];
    @tracked validationWarnings = [];
    @tracked tabs = [
        {
            id: 'configuration',
            label: 'Configuration',
            icon: 'filter',
        },
        {
            id: 'preview',
            label: 'Preview',
            icon: 'table',
        },
    ];

    constructor() {
        super(...arguments);
        this.loadSchema.perform();
        this.buildCurrentResult();
    }

    @task *loadSchema() {
        try {
            this.schema = yield this.fetch.get(
                'reports/tables',
                removeNullish({
                    extension: this.args.extension,
                    category: this.args.category,
                })
            );
            this.tables = isArray(this.schema.tables) ? this.schema.tables : [];
        } catch (e) {
            this.notifications.error('Failed to load data sources');
        }
    }

    @task *execute() {
        this.validationErrors = [];
        this.validationWarnings = [];

        try {
            const result = yield this.fetch.post('reports/execute-query', { query_config: this.queryConfig });
            this.result = result;
            this.updateReportResult(result);
            if (this.tabContext) {
                this.tabContext.selectTabById('preview');
            }
        } catch (err) {
            this.validationErrors = err?.validation_errors ?? [];
            this.validationWarnings = err?.validation_warnings ?? [];
            if (err.message) {
                this.notifications.error(err.message);
            } else {
                this.notifications.serverError(err);
            }
        }
    }

    @action setQueryConfig(queryConfig) {
        console.log('[queryConfig]', queryConfig);
        this.queryConfig = queryConfig;

        if (this.args.report) {
            this.args.report.query_config = queryConfig;
        }

        if (typeof this.args.onQueryConfigChanged === 'function') {
            this.args.onQueryConfigChanged(queryConfig);
        }
    }

    @action updateReportResult(result) {
        if (this.args.report) {
            this.args.report.fillResult(result);
        }
    }

    buildCurrentResult() {
        if (this.args.report?.query_config) {
            this.queryConfig = this.args.report?.query_config ?? {};
        }

        if (isArray(this.args.report?.result_columns)) {
            this.result = {
                columns: this.args.report?.result_columns ?? [],
                data: this.args.report?.data ?? [],
                meta: this.args.report?.meta ?? {},
            };
        }
    }
}
