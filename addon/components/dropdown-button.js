import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { tryInvoke } from '@ember/utils';
import { classify } from '@ember/string';

export default class DropdownButtonComponent extends Component {
  /**
   * Forwards an action to component owner
   *
   * @void
   */
  @action forwardAction(_action, params = [], dd) {
    tryInvoke(dd.actions, 'close');

    if (typeof this.args[`on${classify(_action)}`] === 'function') {
      this.args[`on${classify(_action)}`](...params);
    }

    if (typeof this.args.onAction === 'function') {
      this.args.onAction(_action, ...params);
    }
  }

  /**
   * Default button type
   *
   * @var {String}
   */
  @computed('args.type') get type() {
    return this.args.type || 'default';
  }

  /**
   * Default button size
   *
   * @var {String}
   */
  @computed('args.size') get buttonSize() {
    return this.args.size || 'md';
  }
}
