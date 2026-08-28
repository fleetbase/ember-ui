import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Modal::Layouts::BulkAction example adapter.
 *
 * The documentation is explicit that consumers do not render modal layouts directly — they call
 * `modalsManager.bulk()`, which shows the layout for them. The playground demonstrates the
 * documented path rather than a shortcut, so this adapter opens the dialog through the service.
 */
export default class PlaygroundExampleModalLayoutsBulkActionComponent extends Component {
    @service modalsManager;

    @action open() {
        this.args.onEvent?.('bulk');

        return this.modalsManager.bulk({
            title: this.args.values.title,
            body: this.args.values.body,
            acceptButtonText: this.args.values.acceptButtonText,
            declineButtonText: this.args.values.declineButtonText,
            confirm: () => this.args.onEvent?.('onConfirm'),
            decline: () => this.args.onEvent?.('onDecline'),
        });
    }
}
