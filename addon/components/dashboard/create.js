import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

const POSITION_KEYS = ['x', 'y', 'w', 'h'];

function samePosition(a = {}, b = {}) {
    return POSITION_KEYS.every((key) => a?.[key] === b[key]);
}

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
     * The component's root element, for reaching the gridstack instance mounted inside it.
     * @type {HTMLElement}
     */
    element = null;

    @action setElement(element) {
        this.element = element;
    }

    /**
     * Persists moves and resizes gridstack reports while the layout is being edited.
     *
     * Only the user's edits are written back. gridstack also fires `change` while it lays the
     * grid out at load and whenever it is re-created, and persisting those reflowed positions
     * overwrote what the user had saved. Every reported change is written, not just the first
     * per widget: a widget moved twice used to keep its first position.
     *
     * @param {Event} event - Event containing details about the grid change.
     * @action
     */
    @action onChangeGrid(event) {
        const { dashboard, isEdit } = this.args;
        if (!isEdit || !dashboard) {
            return;
        }

        event.detail.forEach((node) => this.persistNode(dashboard, node));
    }

    /**
     * Leaving edit mode writes back every widget as the grid has it. A widget added without a
     * stored position was placed by gridstack, and a change reported while a save was still in
     * flight may have been superseded; this is what the user sees when they press save.
     * @action
     */
    @action onEditChange(element, [isEdit]) {
        const { dashboard } = this.args;
        if (isEdit || !dashboard) {
            return;
        }

        this.gridNodes().forEach((node) => this.persistNode(dashboard, node));
    }

    /**
     * Writes a grid node's position onto its widget when it differs from what is stored. Other
     * grid options (minW, minH, ...) are kept; the old write replaced them.
     * @param {Object} dashboard
     * @param {Object} node - a gridstack node or change-event entry: `{ id, x, y, w, h }`
     */
    persistNode(dashboard, { id, x, y, w, h }) {
        const widget = dashboard.widgets.find((widget) => widget.id === id);
        if (!widget) {
            return;
        }

        const gridOptions = { ...(widget.grid_options ?? {}), x, y, w, h };
        if (samePosition(widget.grid_options, gridOptions)) {
            return;
        }

        const saved = widget.updateProperties({ grid_options: gridOptions });
        if (typeof saved?.catch === 'function') {
            saved.catch((error) => this.notifications.serverError(error));
        }
    }

    /**
     * The nodes of the gridstack instance mounted in this component, as it currently lays them out.
     * @returns {Array}
     */
    gridNodes() {
        // gridstack attaches itself to the .grid-stack element as `el.gridstack`.
        return this.element?.querySelector('.grid-stack')?.gridstack?.engine?.nodes ?? [];
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

        /* istanbul ignore if -- the remove control is rendered inside {{#each @dashboard.widgets}},
           so there is nothing to press without a dashboard */
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
        this.element?.querySelector('.grid-stack')?.gridstack?.compact?.();
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
