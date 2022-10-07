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
    this.sidebarNode =
      element.previousElementSibling.querySelector('nav.next-sidebar');
  }

  @action routeTo(route) {
    const router = this.router ?? this.hostRouter;

    router.transitionTo(route);
  }

  @action toggleSidebar() {
    if (this.sidebarNode?.classList?.contains('is-open')) {
      this.sidebarNode?.classList?.remove('is-open');
    } else {
      this.sidebarNode?.classList?.add('is-open');
    }
  }
}
