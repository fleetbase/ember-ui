import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task, timeout } from 'ember-concurrency';
import formatDate from '../../utils/format-date';
import {
    REPORT_WIDGET_ROW_LIMIT,
    mapReportExecution,
    resolveReportWidgetResult,
    isFailedExecution,
    resolveRefreshInterval,
    reportExecutionErrorMessage,
} from '../../utils/report-widget-result';

export default class WidgetReportComponent extends Component {
    @service store;
    @service modalsManager;
    @service notifications;
    @service fetch;

    @tracked reportId = this.args.options?.reportId ?? null;
    @tracked report = null;

    /** The latest successful live run, mapped for `Report::Data`. */
    @tracked liveResult = null;

    /** When the latest live run finished. */
    @tracked lastRunAt = null;

    /** The message of the latest failed run, cleared by the next successful one. */
    @tracked runError = null;

    constructor() {
        super(...arguments);
        this.loadReport.perform();
    }

    /**
     * The current report, in the shape the picker wants for its preselection.
     */
    get selectedReports() {
        return this.report ? [this.report] : [];
    }

    /**
     * What the widget renders: the latest live run, or the results stored on the record when
     * no live run has succeeded yet (for instance because the run failed).
     */
    get result() {
        return resolveReportWidgetResult(this.liveResult, this.report, REPORT_WIDGET_ROW_LIMIT);
    }

    get isShowingStoredResult() {
        return this.result?.source === 'stored';
    }

    get lastRunDisplay() {
        return this.lastRunAt ? formatDate(this.lastRunAt, 'PP p') : null;
    }

    /** The polling interval in milliseconds; 0 when polling is off (the default). */
    get refreshInterval() {
        return resolveRefreshInterval(this.args.options);
    }

    @action refresh() {
        return this.runReport.perform();
    }

    resetRun() {
        this.runReport.cancelAll();
        this.liveResult = null;
        this.lastRunAt = null;
        this.runError = null;
    }

    @action selectReport() {
        this.modalsManager.show('modals/find-select-report', {
            title: 'Select report',
            acceptButtonText: 'Confirm',
            limit: 1,
            selected: this.selectedReports,
            onChange: ([selectedReport] = []) => {
                this.resetRun();
                this.report = selectedReport ?? null;
                this.reportId = selectedReport?.id ?? null;
            },
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.saveWidget.perform();
                    modal.done();
                    this.startRunning();
                } catch (err) {
                    this.notifications.serverError(err);
                }
            },
        });
    }

    @task *loadReport() {
        if (!this.reportId) {
            return;
        }

        try {
            this.report = yield this.store.findRecord('report', this.reportId);
        } catch (err) {
            this.report = null;
            this.notifications.serverError(err);
            return;
        }

        this.startRunning();
    }

    /**
     * Run the current report once, then keep polling if the widget's options ask for it.
     */
    startRunning() {
        if (!this.report) {
            return;
        }

        this.runReport.perform();

        if (this.refreshInterval > 0) {
            this.pollReport.perform();
        } else {
            this.pollReport.cancelAll();
        }
    }

    /**
     * Run the report live through core-api (`POST reports/{id}/execute`). The result is kept on
     * the component rather than filled onto the record, so the record is never dirtied. A
     * failed run is shown inline and the widget keeps the last good (or stored) result.
     */
    @task({ restartable: true }) *runReport() {
        const report = this.report;
        if (!report?.id) {
            return;
        }

        try {
            const response = typeof report.execute === 'function' ? yield report.execute() : yield this.fetch.post(`reports/${report.id}/execute`);

            if (isFailedExecution(response)) {
                throw response;
            }

            this.liveResult = mapReportExecution(response, REPORT_WIDGET_ROW_LIMIT);
            this.lastRunAt = new Date();
            this.runError = null;
        } catch (err) {
            this.runError = reportExecutionErrorMessage(err);
        }
    }

    /**
     * Wait out one polling interval.
     *
     * @param {Number} interval milliseconds
     */
    pollDelay(interval) {
        return timeout(interval);
    }

    /**
     * Re-run the report on the configured interval. ember-concurrency cancels this task when
     * the component is destroyed, which stops the polling.
     */
    @task({ restartable: true }) *pollReport() {
        const interval = this.refreshInterval;
        /* istanbul ignore next -- startRunning only performs this task with a positive interval */
        if (interval <= 0) {
            return;
        }

        for (;;) {
            yield this.pollDelay(interval);
            // Not yielded: a manual refresh restarts runReport, and that must not end the polling.
            this.runReport.perform();
        }
    }

    @task *saveWidget() {
        const widget = this.args.widget;
        if (!widget || !this.reportId) {
            return;
        }

        const options = {
            ...(widget.options ?? {}),
            reportId: this.reportId,
        };

        if (typeof widget.setProperties === 'function') {
            widget.setProperties({ options });
        } else {
            widget.options = options;
        }

        if (typeof widget.save === 'function') {
            yield widget.save();
        }
    }
}
