import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Component responsible for creating and managing the dashboard layout.
 * Provides functionalities such as toggling widget float, changing grid layout, and removing widgets.
 *
 * @extends Component
 */
export default class DashboardCreateComponent extends Component {
    /**
     * Notifications service for displaying alerts or errors.
     * @type {Service}
     */
    @service notifications;

    /**
     * Tracked array to keep track of widgets that have been updated.
     * @type {Array}
     */
    @tracked updatedWidgets = [];

    /**
     * Action to toggle the floating state of widgets on the grid.
     */
    @action toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    /**
     * Handles changes to the grid layout, such as repositioning or resizing widgets.
     * Iterates over each widget event detail and updates the corresponding widget's properties if necessary.
     *
     * @param {Event} event - Event containing details about the grid change.
     * @action
     */
    @action onChangeGrid(event) {
        const { dashboard } = this.args;

        event.detail.forEach((currentWidgetEvent) => {
            const alreadyUpdated = this.updatedWidgets.find((item) => item.id === currentWidgetEvent.id);
            if (alreadyUpdated || !this.dashboard) {
                return;
            }

            const changedWidget = dashboard.widgets.find((widget) => widget.id === currentWidgetEvent.id);
            if (!changedWidget) {
                return;
            }

            const { x, y, w, h } = currentWidgetEvent;
            const response = changedWidget.updateProperties({
                grid_options: { x, y, w, h },
            });
            if (response) {
                this.updatedWidgets.push(changedWidget);
            }
        });
    }

    /**
     * Removes a specified widget from the dashboard.
     * Performs a removal operation on the dashboard and handles any errors that occur during the process.
     *
     * @param {Object} widget - The widget object to be removed.
     * @action
     */
    @action removeWidget(widget) {
        const { dashboard } = this.args;

        if (!dashboard) return;

        dashboard
            .removeWidget(widget.id)
            .then(() => this.compactGrid())
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }

    /**
     * Trigger gridstack's compaction pass so the grid closes the empty cell left
     * behind when a widget is removed. Without this, `float: true` leaves a
     * persistent gap where the deleted widget used to sit.
     */
    compactGrid() {
        // gridstack attaches itself to the .grid-stack element as `el.gridstack`.
        // Scoped query so we don't fight other grids on the page.
        const root = document.querySelector('.fleetbase-dashboard-grid .grid-stack');
        root?.gridstack?.compact?.();
    }

    get gridOptions() {
        return {
            float: true,
            animate: true,
            acceptWidgets: true,
            alwaysShowResizeHandle: this.args.isEdit,
            disableDrag: !this.args.isEdit,
            disableResize: !this.args.isEdit,
            resizable: { handles: 'all' },
            cellHeight: 30,
        };
    }

    /**
     * Wrapping the GridStack in `{{#each (array @dashboard.id) key="@identity"}}`
     * keys the entire subtree to the active dashboard's id. This getter exists
     * to give the template a single-element array to iterate. When the id
     * changes, ember treats the iteration item as a different key, destroys
     * the existing GridStack (running its willDestroyNode → gridstack.destroy
     * + DOM removal), and re-instantiates it for the new dashboard.
     *
     * This is the only reliable way to clear gridstack's internal engine state
     * AND the inline `min-height/height` styles it stamps onto `.grid-stack`.
     * Without a real DOM remount, switching from a tall dashboard to a short
     * one leaves the empty band where the old widgets used to sit because
     * gridstack's destroy(false) preserves DOM (and therefore those styles).
     */
    get dashboardKey() {
        return [this.args.dashboard?.id ?? '__empty__'];
    }
}
