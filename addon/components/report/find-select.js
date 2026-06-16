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
        if (!report) {
            return;
        }

        if (this.limit !== null && this.selectedReports.length >= this.limit) {
            return;
        }

        const alreadySelected = this.selectedReports.some((selectedReport) => selectedReport.id === report.id);
        if (alreadySelected) {
            return;
        }

        this.selectedReports = [...this.selectedReports, report];
        this.notifyChange();
    }

    @action removeReport(report) {
        if (!report) {
            return;
        }

        const selectedReports = this.selectedReports.filter((selectedReport) => selectedReport.id !== report.id);
        if (selectedReports.length === this.selectedReports.length) {
            return;
        }

        this.selectedReports = selectedReports;
        this.notifyChange();
    }

    @action onInput(event) {
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
