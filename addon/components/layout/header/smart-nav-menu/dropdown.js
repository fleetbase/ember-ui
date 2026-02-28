import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * `Layout::Header::SmartNavMenu::Dropdown`
 *
 * The "More" overflow dropdown panel.  Displays all extension items that
 * could not fit in the visible bar, plus a footer link to open the
 * customiser panel.
 *
 * @class LayoutHeaderSmartNavMenuDropdownComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuDropdownComponent extends Component {
    @service router;
    @service hostRouter;

    /**
     * Navigate to a route and close the dropdown.
     *
     * @param {string} route
     */
    @action navigateTo(route) {
        const r = this.router ?? this.hostRouter;
        r.transitionTo(route);
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    /**
     * Handle a custom onClick item and close the dropdown.
     *
     * @param {Function} handler
     */
    @action handleItemClick(handler) {
        if (typeof handler === 'function') {
            handler();
        }
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    /** Open the customiser panel. */
    @action openCustomizer() {
        if (typeof this.args.onOpenCustomizer === 'function') {
            this.args.onOpenCustomizer();
        }
    }
}
