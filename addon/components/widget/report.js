import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';

export default class WidgetReportComponent extends Component {
    @service store;
    @service modalsManager;
    @service notifications;

    @tracked reportId = this.args.options?.reportId ?? null;
    @tracked report = null;

    constructor() {
        super(...arguments);
        this.loadReport.perform();
    }

    /**
     * The current report, in the shape the picker wants for its preselection.
     *
     * Note that it can only ever be empty today: the "Select Report" button lives in the empty
     * state of report.hbs, so `selectReport` is unreachable once a report has loaded, and the
     * widget offers no way to change its report. See NEED_INFO.
     */
    get selectedReports() {
        /* istanbul ignore next -- see above: whenever the control that opens the picker is
           rendered, this.report is null */
        return this.report ? [this.report] : [];
    }

    @action selectReport() {
        this.modalsManager.show('modals/find-select-report', {
            title: 'Select report',
            acceptButtonText: 'Confirm',
            limit: 1,
            selected: this.selectedReports,
            onChange: ([selectedReport] = []) => {
                this.report = selectedReport ?? null;
                this.reportId = selectedReport?.id ?? null;
            },
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.saveWidget.perform();
                    modal.done();
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
