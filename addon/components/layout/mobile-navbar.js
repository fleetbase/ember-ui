import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { action } from '@ember/object';

export default class LayoutMobileNavbarComponent extends Component {
    @service router;
    @service hostRouter;
    @service sidebar;
    @service abilities;
    @service universe;
    @tracked extensions = [];
    @tracked menuItems = [];
    routeDidChangeHandler = null;

    constructor(owner, { menuItems = [] }) {
        super(...arguments);
        this.extensions = getOwner(this).application.extensions ?? [];
        this.menuItems = this.mergeMenuItems(menuItems);
        this.routeDidChangeHandler = () => this.closeSidebar();
        this.getRouter().on('routeDidChange', this.routeDidChangeHandler);

        if (typeof this.args.onSetup === 'function') {
            this.args.onSetup(this);
        }
    }

    mergeMenuItems(menuItems = []) {
        const headerMenuItems = this.universe.headerMenuItems;
        const visibleMenuItems = [];
        for (let i = 0; i < headerMenuItems.length; i++) {
            const menuItem = headerMenuItems[i];
            if (this.abilities.can(`${menuItem.id} see extension`)) {
                visibleMenuItems.pushObject(menuItem);
            }
        }

        // Merge additionals
        visibleMenuItems.pushObjects(menuItems);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateMenuItems === 'function') {
            this.args.mutateMenuItems(menuItems);
        }

        return visibleMenuItems;
    }

    @action async routeTo(route) {
        try {
            await this.getRouter().transitionTo(route);
            this.closeSidebar();
        } catch (error) {
            void error;
        }
    }

    @action toggleSidebar() {
        this.sidebar.toggle();
    }

    @action isSidebarOpen() {
        return this.sidebar.isVisible;
    }

    @action closeSidebar() {
        this.sidebar.hide();
    }

    @action openSidebar() {
        this.sidebar.show();
    }

    willDestroy() {
        super.willDestroy(...arguments);
        if (this.routeDidChangeHandler) {
            this.getRouter().off('routeDidChange', this.routeDidChangeHandler);
            this.routeDidChangeHandler = null;
        }
    }

    getRouter() {
        return this.router ?? this.hostRouter;
    }
}
