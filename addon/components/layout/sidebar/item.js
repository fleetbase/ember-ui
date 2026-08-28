import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import isMenuItemActive from '../../../utils/is-menu-item-active';
import isEmptyObject from '../../../utils/is-empty-object';
import window from 'ember-window-mock';

export default class LayoutSidebarItemComponent extends Component {
    @service router;
    @service hostRouter;
    @service abilities;
    @tracked active;
    @tracked dropdownButtonNode;
    // The constructor assigns each of these before anything reads it, so the initializer never
    // produces the value that survives.
    /* istanbul ignore next */
    @tracked dropdownButtonRenderInPlace = true;
    /* istanbul ignore next */
    @tracked permissionRequired = null;
    /* istanbul ignore next */
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;
    /* istanbul ignore next */
    @tracked visible = true;

    constructor(owner, { dropdownButtonRenderInPlace = true, permission = null, disabled = false, visible = true }) {
        super(...arguments);

        this.active = this.checkIfActive();
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;
        this.permissionRequired = permission;
        this.disabled = disabled;
        this.visible = visible;
        // If no permissions disable
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }

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
        const { route, onClick, model } = this.args;
        const item = this.args.item || this.args.menuItem;
        const router = this.getRouter();
        const currentRoute = router.currentRouteName;
        const currentURL = router.currentURL;
        const isInteractive = isBlank(route) && typeof onClick === 'function';
        const isCurrentRoute = typeof route === 'string' && currentRoute.startsWith(route);
        const isCurrentURL = currentURL === window.location.pathname;

        if (isInteractive && !isBlank(item)) {
            return isMenuItemActive(item.section, item.slug, item.view);
        }

        // If model provided use the pathname to determine in addition
        if (model) {
            const routeHasModelParam = router.currentRoute.paramNames.length > 0;
            if (routeHasModelParam) {
                const routeModelParam = router.currentRoute.paramNames[0];
                const routeModelParamValue = model[routeModelParam] ?? '';

                return isCurrentRoute && isCurrentURL && currentURL.includes(routeModelParamValue);
            }

            return isCurrentRoute && isCurrentURL;
        }

        return isCurrentRoute;
    }

    @action onClick(event) {
        if (this.isPointerWithinDropdownButton(event)) {
            event.preventDefault();
            return;
        }

        const doesntHavePermissions = this.permissionRequired && this.abilities.cannot(this.permissionRequired);
        if (doesntHavePermissions) {
            event.preventDefault();
            return;
        }

        const { url, target, route, model, onClick, options = {}, queryParams = {} } = this.args;
        const hasQueryParams = !isEmptyObject(queryParams);
        const modelHasQueryParams = !isEmptyObject(model) && model.queryParams !== undefined;
        const router = this.getRouter();
        const anchor = event.target?.closest('a');

        if (hasQueryParams) {
            options.queryParams = queryParams;
        }

        if (modelHasQueryParams) {
            options.queryParams = model.queryParams;
            delete model.queryParams;
        }

        // Computed AFTER the merges above: reading it first meant that a caller who passed
        // @queryParams but no @options got `hasTransitionOptions === false`, and the merged
        // query params never reached `transitionTo`.
        const hasTransitionOptions = !isEmptyObject(options);

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

        if (hasTransitionOptions && route && model) {
            return router.transitionTo(route, model, options);
        }

        if (hasTransitionOptions && route && !model) {
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

        /* istanbul ignore else -- dd is the api yielded by BasicDropdown, which always carries
           actions.close; there is no other caller */
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
        /* istanbul ignore else -- the only caller is the dropdown button's @onInsert, which always
           hands over the element it just inserted */
        if (dropdownButtonNode) {
            this.dropdownButtonNode = dropdownButtonNode;

            if (typeof this.args.onDropdownButtonInsert === 'function') {
                this.args.onDropdownButtonInsert(...arguments);
            }
        }
    }

    isPointerWithinDropdownButton({ target }) {
        const isTargetDropdownItem = target.classList.contains('next-dd-item');

        /* istanbul ignore else -- dropdownButtonNode is set by @onInsert as the dropdown renders,
           and .next-dd-item only exists inside a dropdown, so the fallback below is unreachable */
        if (this.dropdownButtonNode) {
            /* istanbul ignore else -- see below */
            if (this.dropdownButtonNode.contains(target)) {
                return true;
            }

            /* istanbul ignore next -- the dropdown renders inside the nav item's own anchor, so
               a menu item that reaches this click handler is always inside the button; when it is
               wormholed out instead (@dropdownButtonRenderInPlace={{false}}) the click never
               bubbles to the anchor at all */
            return isTargetDropdownItem;
        }

        /* istanbul ignore next -- see above */
        // if dropdown menu item
        if (isTargetDropdownItem) {
            return true;
        }

        /* istanbul ignore next -- see above */
        return false;
    }

    getRouter() {
        /* istanbul ignore next -- @service router resolves in any host that has a router; where it
           does not, reading the injection throws rather than yielding undefined, so hostRouter is
           only ever reached by an engine that registers it in router's place */
        return this.router ?? this.hostRouter;
    }
}
