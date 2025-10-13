import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { dasherize } from '@ember/string';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';
import isUuid from '@fleetbase/ember-core/utils/is-uuid';

export default class WithRecordComponent extends Component {
    @service store;
    @tracked record = null;
    @tracked error = null;

    constructor(owner, { id, type }) {
        super(...arguments);
        if (!this.#validRequest(id, type)) return;
        this.loadRecord.perform(id, type);
    }

    @task *loadRecord(id, type) {
        const modelType = dasherize(type);

        try {
            let record = this.store.peekRecord(modelType, id);
            if (!record) {
                record = yield this.store.findRecord(modelType, id);
            }
            if (!record) return;
            this.record = record;
            return record;
        } catch (err) {
            this.error = err.message ?? 'Failed to load record.';
            debug('<WithRecord /> Failed to load record for use in template: ' + err.message);
        }
    }

    #validRequest(id, type) {
        return typeof id === 'string' && isUuid(id) && typeof type === 'string';
    }
}
