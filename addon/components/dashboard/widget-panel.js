import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class DashboardWidgetPanelComponent extends Component {
    @service('universe/widget-service') widgetService;
    @service notifications;
    @tracked defaultDashboardId = this.args.defaultDashboardId ?? 'dashboard';
    @tracked dashboard;
    @tracked isOpen = true;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { dashboard, defaultDashboardId = 'dashboard' }) {
        super(...arguments);
        this.defaultDashboardId = defaultDashboardId;
        this.dashboard = dashboard;
    }

    /**
     * Gets available widgets for the dashboard.
     * Computed as a getter to ensure reactivity when widgets are registered.
     * @returns {Array} Available widgets
     */
    get availableWidgets() {
        const dashboardId = this.args.defaultDashboardId || this.defaultDashboardId || 'dashboard';
        return this.widgetService.getWidgets(dashboardId);
    }

    /**
     * Adds a new available widget to the current dashboard.
     *
     * @param {Component|Widget|string} widget
     * @memberof DashboardWidgetPanelComponent
     */
    @task *addWidgetToDashboard(widget) {
        // If widget is a component definition/class
        if (typeof widget.component === 'function') {
            widget.component = widget.component.name;
        }

        try {
            yield this.args.dashboard.addWidget(widget);
        } catch (err) {
            this.notifications.serverError(err);
        }
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;

        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     */
    @action onPressClose() {
        this.isOpen = false;

        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
