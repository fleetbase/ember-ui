import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';

/**
 * `Layout::Header::SmartNavMenu::Item`
 *
 * Renders a single extension navigation link inside the SmartNavMenu bar.
 * Handles both standard route links and custom `onClick` handlers.
 *
 * @class LayoutHeaderSmartNavMenuItemComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuItemComponent extends Component {
    @service router;
    @service hostRouter;

    /**
     * Whether the item's route matches the current route, making it "active".
     */
    @computed('args.item.route', 'router.currentRouteName', 'hostRouter.currentRouteName')
    get isActive() {
        const route = this.args.item?.route;
        if (!route) return false;
        const current = (this.router ?? this.hostRouter).currentRouteName ?? '';
        return current.startsWith(route);
    }
}
