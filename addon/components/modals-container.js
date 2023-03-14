import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ModalsContainer extends Component {
  @service modalsManager;

  /**
   * @category Action Handlers
   */
  @action confirm() {
    this.modalsManager.onConfirmClick(...arguments);
  }

  /**
   * @category Action Handlers
   */
  @action decline() {
    this.modalsManager.onDeclineClick(...arguments);
  }
}
