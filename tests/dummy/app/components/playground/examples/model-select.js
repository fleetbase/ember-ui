import ControlledExample from 'dummy/playground/controlled';
import { inject as service } from '@ember/service';
import { DRIVERS, storeResult } from 'dummy/playground/fixtures';

/**
 * ModelSelect loads through the store, so the adapter seeds the dummy store with a fixed set of
 * driver fixtures. No API request is issued.
 */
export default class PlaygroundExampleModelSelectComponent extends ControlledExample {
    @service store;

    constructor() {
        super(...arguments);

        this.store.queryResults.driver = storeResult(DRIVERS);
    }
}
