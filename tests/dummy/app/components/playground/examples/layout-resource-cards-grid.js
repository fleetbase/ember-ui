import Component from '@glimmer/component';
import { ORDERS, PAGINATION_META } from 'dummy/playground/fixtures';

export default class PlaygroundExampleLayoutResourceCardsGridComponent extends Component {
    meta = PAGINATION_META;

    get data() {
        return this.args.scenario === 'empty' ? [] : ORDERS;
    }
}
