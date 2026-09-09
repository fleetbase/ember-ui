import Component from '@glimmer/component';
import { ORDERS, ORDER_COLUMNS, PAGINATION_META } from 'dummy/playground/fixtures';

export default class PlaygroundExampleTableComponent extends Component {
    columns = ORDER_COLUMNS;

    meta = PAGINATION_META;

    /** The "empty" scenario is what makes the empty state reachable without special-casing it. */
    get rows() {
        return this.args.scenario === 'empty' ? [] : ORDERS;
    }
}
