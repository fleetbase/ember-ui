import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ModalsContainer extends Component {
  @service modalsManager;

  /**
   * @category Action Handlers
   */
  @action confirm(v) {
    this.modalsManager.onConfirmClick(v);
  }

  /**
   * @category Action Handlers
   */
  @action decline(v) {
    this.modalsManager.onDeclineClick(v);
  }
}
