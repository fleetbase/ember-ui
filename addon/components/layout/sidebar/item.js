import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutSidebarItemComponent extends Component {
  @service router;
  @service hostRouter;

  @action onClick(event) {
    const { url, target, route, model, onClick } = this.args;
    const router = this.router ?? this.hostRouter;
    const anchor = event.target?.closest('a');

    if (
      anchor &&
      anchor.attributes?.disabled &&
      anchor.attributes.disabled !== 'disabled="false"'
    ) {
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

    if (route && model) {
      return router.transitionTo(route, model);
    }

    if (route) {
      return router.transitionTo(route);
    }
  }
}
