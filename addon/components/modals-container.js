import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ModalsContainer extends Component {
    @service modalsManager;

    /**
     * @category Action Handlers
     */
    @action confirm(modalId) {
        this.modalsManager.onClickConfirmWithDone(modalId);
    }

    /**
     * @category Action Handlers
     */
    @action decline(modalId) {
        this.modalsManager.onClickDeclineWithDone(modalId);
    }
}
