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

    get selectedReports() {
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
