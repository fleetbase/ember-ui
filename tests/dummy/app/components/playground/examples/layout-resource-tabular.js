import Component from '@glimmer/component';
import { ORDERS, ORDER_COLUMNS, PAGINATION_META } from 'dummy/playground/fixtures';

export default class PlaygroundExampleLayoutResourceTabularComponent extends Component {
    columns = ORDER_COLUMNS;

    meta = PAGINATION_META;

    get rows() {
        return this.args.scenario === 'empty' ? [] : ORDERS;
    }
}
