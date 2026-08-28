import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { ACTIVITIES, storeResult } from 'dummy/playground/fixtures';

/**
 * ActivityLog loads its rows through `store.query('activity', …)`, so the adapter seeds the dummy
 * store rather than passing rows in. Nothing is fetched over the network and nothing is persisted.
 */
export default class PlaygroundExampleActivityLogComponent extends Component {
    @service store;

    constructor() {
        super(...arguments);

        this.store.queryResults.activity = storeResult(ACTIVITIES);
    }
}
