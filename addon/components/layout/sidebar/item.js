import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import isMenuItemActive from '../../../utils/is-menu-item-active';

export default class LayoutSidebarItemComponent extends Component {
    @service router;
    @service hostRouter;
    @tracked active;
    @tracked dropdownButtonNode;
    @tracked dropdownButtonRenderInPlace = true;

    constructor(owner, { dropdownButtonRenderInPlace = true }) {
        super(...arguments);

        this.active = this.checkIfActive();
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;

        const router = this.getRouter();
        router.on('routeDidChange', this.trackActiveFlag);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        const router = this.getRouter();
        router.off('routeDidChange', this.trackActiveFlag);
    }

    @action trackActiveFlag() {
        this.active = this.checkIfActive();
    }

    @action checkIfActive() {
        const { route, onClick, item } = this.args;
        const router = this.getRouter();
        const currentRoute = router.currentRouteName;
        const isInteractive = isBlank(route) && typeof onClick === 'function';

        if (isInteractive && !isBlank(item)) {
            return isMenuItemActive(item.section, item.slug, item.view);
        }

        return typeof route === 'string' && currentRoute.startsWith(route);
    }

    @action onClick(event) {
        if (this.isPointerWithinDropdownButton(event)) {
            event.preventDefault();
            return;
        }

        const { url, target, route, model, onClick, options } = this.args;
        const router = this.getRouter();
        const anchor = event.target?.closest('a');

        if (anchor && anchor.attributes?.disabled && anchor.attributes.disabled !== 'disabled="false"') {
            return;
        }

        if (target && url) {
            return window.open(url, target);
        }

        if (url) {
            return (window.location.href = url);
        }

        if (typeof onClick === 'function') {
            return onClick();
        }

        if (!isBlank(options) && route && model) {
            return router.transitionTo(route, model, options);
        }

        if (!isBlank(options) && route) {
            return router.transitionTo(route, options);
        }

        if (route && model) {
            return router.transitionTo(route, model);
        }

        if (route) {
            return router.transitionTo(route);
        }
    }

    @action onDropdownItemClick(action, dd) {
        const context = this.getDropdownContext(action);

        if (typeof dd.actions === 'object' && typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        if (typeof action.fn === 'function') {
            action.fn(context);
        }

        if (typeof action.onClick === 'function') {
            action.onClick(context);
        }
    }

    getDropdownContext(action) {
        let context = null;

        if (action && action.context) {
            context = action.context;
        }

        if (this.args.dropdownContext) {
            context = this.args.dropdownContext;
        }

        return context;
    }

    @action onRegisterAPI() {
        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(...arguments);
        }
    }

    @action onDropdownButtonInsert(dropdownButtonNode) {
        if (dropdownButtonNode) {
            this.dropdownButtonNode = dropdownButtonNode;

            if (typeof this.args.onDropdownButtonInsert === 'function') {
                this.args.onDropdownButtonInsert(...arguments);
            }
        }
    }

    isPointerWithinDropdownButton({ target }) {
        const isTargetDropdownItem = target.classList.contains('next-dd-item');

        if (this.dropdownButtonNode) {
            return this.dropdownButtonNode.contains(target) || isTargetDropdownItem;
        }

        // if dropdown menu item
        if (isTargetDropdownItem) {
            return true;
        }

        return false;
    }

    getRouter() {
        return this.router ?? this.hostRouter;
    }
}
