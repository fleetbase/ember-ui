import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutMobileNavbarComponent extends Component {
    @service router;
    @service hostRouter;
    @tracked navbarNode;
    @tracked sidebarNode;

    @action setupMobileNavbar(element) {
        this.navbarNode = element;
        this.sidebarNode = element.previousElementSibling.querySelector('nav.next-sidebar');

        if (typeof this.args.onSetup === 'function') {
            this.onSetup(this);
        }

        // when hostrouter transitions close sidebar automatically
        this.getRouter().on('routeDidChange', this.closeSidebar.bind(this));
    }

    getRouter() {
        return this.router ?? this.hostRouter;
    }

    @action routeTo(route) {
        this.getRouter()
            .transitionTo(route)
            .then(() => {
                this.closeSidebar();
            });
    }

    @action toggleSidebar() {
        if (this.isSidebarOpen()) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    @action isSidebarOpen() {
        return this.sidebarNode?.classList?.contains('is-open');
    }

    @action closeSidebar() {
        this.sidebarNode?.classList?.remove('is-open');
    }

    @action openSidebar() {
        this.sidebarNode?.classList?.add('is-open');
    }
}
