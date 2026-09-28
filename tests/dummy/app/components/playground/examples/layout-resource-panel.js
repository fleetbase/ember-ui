import Component from '@glimmer/component';
import { action } from '@ember/object';
import { ORDERS } from 'dummy/playground/fixtures';

/**
 * The panel's save action is deliberately opt-in: it only appears when a consumer passes
 * `@saveTask`. A local no-op task is passed so the button is demonstrable.
 */
export default class PlaygroundExampleLayoutResourcePanelComponent extends Component {
    resource = ORDERS[0];

    @action save() {
        this.args.onEvent?.('saveTask');

        return Promise.resolve();
    }
}
