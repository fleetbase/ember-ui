import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { isArray } from '@ember/array';
import { task, timeout } from 'ember-concurrency';

const SEARCH_DEBOUNCE_MS = 300;

export default class ReportFindSelectComponent extends Component {
    @service store;

    @tracked reports = [];
    @tracked searchTerm = '';
    @tracked selectedReports = [];
    @tracked limit = null;

    constructor() {
        super(...arguments);

        this.limit = this.args.limit ?? null;
        this.selectedReports = this.normalizeSelected(this.args.selected);
        this.queryReports.perform();
    }

    normalizeSelected(selected) {
        if (!selected) {
            return [];
        }

        return isArray(selected) ? [...selected] : [selected];
    }

    @action selectReport(report) {
        /* istanbul ignore next -- only invoked as `(fn this.selectReport report)` from the
           `{{#each}}`, so a report is always supplied. */
        if (!report) {
            return;
        }

        if (this.limit !== null && this.selectedReports.length >= this.limit) {
            return;
        }

        /* istanbul ignore next -- the Select button is rendered `@disabled={{includes report.id …}}`,
           so an already-selected report cannot be selected again. */
        const alreadySelected = this.selectedReports.some((selectedReport) => selectedReport.id === report.id);
        /* istanbul ignore next -- see above. */
        if (alreadySelected) {
            return;
        }

        this.selectedReports = [...this.selectedReports, report];
        this.notifyChange();
    }

    @action removeReport(report) {
        /* istanbul ignore next -- only invoked as `(fn this.removeReport report)` from the
           `{{#each}}`, so a report is always supplied. */
        if (!report) {
            return;
        }

        const selectedReports = this.selectedReports.filter((selectedReport) => selectedReport.id !== report.id);
        /* istanbul ignore next -- the Remove button is rendered `@disabled={{not (includes …)}}`,
           so only a selected report can be removed and the filter always drops one. */
        if (selectedReports.length === this.selectedReports.length) {
            return;
        }

        this.selectedReports = selectedReports;
        this.notifyChange();
    }

    @action onInput(event) {
        /* istanbul ignore next -- wired as `{{on "input" this.onInput}}`, which always delivers an
           event carrying the target. */
        this.searchTerm = event?.target?.value ?? '';
        this.searchTask.perform(this.searchTerm);
    }

    notifyChange() {
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selectedReports);
        }
    }

    @task({ restartable: true }) *searchTask(term) {
        yield timeout(SEARCH_DEBOUNCE_MS);
        const params = term ? { query: term } : {};
        yield this.queryReports.perform(params);
    }

    @task({ restartable: true }) *queryReports(params = {}) {
        try {
            this.reports = yield this.store.query('report', params);
        } catch (err) {
            debug('[ReportFindSelect] Unable to query reports:', err);

            if (typeof this.args.onError === 'function') {
                this.args.onError(err);
            }

            this.reports = [];
        }
    }
}
