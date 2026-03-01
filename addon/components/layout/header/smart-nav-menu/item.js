import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

/**
 * `Layout::Header::SmartNavMenu::Item`
 *
 * Renders a single extension navigation link inside the SmartNavMenu bar
 * using `<LinkToExternal />`, matching the original next-catalog-menu-items
 * implementation exactly.
 *
 * @class LayoutHeaderSmartNavMenuItemComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuItemComponent extends Component {
    @service router;
    @service hostRouter;

    /**
     * Whether the item's route matches the current route, making it "active".
     * Defined as a native getter so Glimmer's auto-tracking picks up router
     * changes without needing the classic `@computed` decorator.
     */
    get isActive() {
        const route = this.args.item?.route;
        if (!route) return false;
        const r = this.router ?? this.hostRouter;
        const current = r?.currentRouteName ?? '';
        return current.startsWith(route);
    }
}
