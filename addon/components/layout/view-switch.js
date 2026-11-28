import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { activateItem, isRouteActive } from '../../utils/shell';

export const DEFAULT_VIEWS = [
    { id: 'map', label: 'Map' },
    { id: 'table', label: 'Table' },
    { id: 'board', label: 'Board' },
];

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

/**
 * `Layout::ViewSwitch` — the floating segmented pill, top-centre over the
 * canvas, that switches a page between its views (C2, J1) and carries the
 * page's primary action.
 *
 * ```hbs
 * <Layout::ViewSwitch
 *     @views={{array (hash id="map" label="Map") (hash id="table" label="Table" count=57)}}
 *     @selected={{this.view}}
 *     @onChange={{this.setView}}
 *     @primaryAction={{hash label="New order" icon="plus" onClick=this.create}}
 * />
 * ```
 *
 * - `@views` `[{ id, label, count?, route?, models?, query? }]`; Map, Table and
 *   Board when omitted.
 * - `@selected` the selected view id. Without it, the view whose `route` is
 *   active is selected, else the last one clicked (the first to start with).
 * - `@onChange(id, view)` is called on selection. Without it a view with a
 *   `route` navigates there.
 * - `@primaryAction` `{ label, icon?, onClick | action | route }`, or an
 *   `<:actions>` block for anything else.
 * - `@label` the radio group's accessible name (default "View").
 *
 * The views are a radio group: arrow keys, Home and End move the selection.
 */
export default class LayoutViewSwitchComponent extends Component {
    @service router;
    @tracked lastSelected = null;

    get views() {
        const views = Array.isArray(this.args.views) ? this.args.views : DEFAULT_VIEWS;
        const selected = this.selectedId(views);
        return views.map((view) => {
            const isSelected = view.id === selected;
            return { ...view, isSelected, hasCount: view.count !== undefined && view.count !== null };
        });
    }

    selectedId(views) {
        if (this.args.selected !== undefined && this.args.selected !== null) {
            return this.args.selected;
        }

        const routed = views.filter((view) => isRouteActive(this.router, view.route)).sort((a, b) => b.route.length - a.route.length)[0];
        if (routed) {
            return routed.id;
        }

        if (this.lastSelected && views.some((view) => view.id === this.lastSelected)) {
            return this.lastSelected;
        }

        return views[0]?.id;
    }

    get primaryAction() {
        const primary = this.args.primaryAction;
        return primary && primary.label ? primary : null;
    }

    @action select(view) {
        this.lastSelected = view.id;

        if (typeof this.args.onChange === 'function') {
            return this.args.onChange(view.id, view);
        }

        if (view.route) {
            return activateItem(this.router, view);
        }
    }

    @action runPrimary() {
        return activateItem(this.router, this.primaryAction);
    }

    @action onKeydown(event) {
        const views = this.views;
        const current = views.findIndex((view) => view.isSelected);
        let next = null;

        if (NEXT_KEYS.includes(event.key)) {
            next = (current + 1) % views.length;
        } else if (PREVIOUS_KEYS.includes(event.key)) {
            next = (current - 1 + views.length) % views.length;
        } else if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = views.length - 1;
        }

        if (next === null) {
            return;
        }

        event.preventDefault();
        const radios = event.currentTarget.querySelectorAll('[role="radio"]');
        this.select(views[next]);
        radios[next].focus();
    }
}
