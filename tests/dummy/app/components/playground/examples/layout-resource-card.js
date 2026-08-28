import Component from '@glimmer/component';
import { ORDERS } from 'dummy/playground/fixtures';

export default class PlaygroundExampleLayoutResourceCardComponent extends Component {
    get model() {
        return ORDERS[this.args.values.index] ?? ORDERS[0];
    }
}
