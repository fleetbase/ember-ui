import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class ContentPanelComponent extends Component {
  @tracked _isOpen = true;

  set isOpen(isOpen) {
    this._isOpen = isOpen;
  }

  @computed('_isOpen', 'args.isOpen') get isOpen() {
    const { isOpen } = this.args;

    if (isOpen !== undefined) {
      return isOpen;
    }

    return this._isOpen;
  }

  @action toggle() {
    this.isOpen = !this.isOpen;
  }

  @action open() {
    this.isOpen = true;
  }

  @action close() {
    this.isOpen = false;
  }

  @action setupComponent() {
    if (typeof this.args.onInsert === 'function') {
      this.args.onInsert(...arguments);
    }
  }
}
