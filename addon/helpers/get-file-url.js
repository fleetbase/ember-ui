import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import isUuid from '@fleetbase/ember-core/utils/is-uuid';

export default class GetFileUrlHelper extends Helper {
    @service store;

    @tracked lastInput = undefined;
    @tracked value = null; // what the template sees

    compute([input]) {
        // unchanged input -> return cached value
        if (input === this.lastInput) {
            return this.value;
        }

        this.lastInput = input;
        this.value = null;

        // nothing passed
        if (!input) {
            return null;
        }

        // plain URL (non-UUID) — return immediately
        if (!isUuid(input)) {
            this.value = String(input);
            return this.value;
        }

        // UUID — load file asynchronously then recompute
        this.#loadUrlForId(input);
        return this.value; // null for now; will update when load finishes
    }

    async #loadUrlForId(id) {
        let file = this.store.peekRecord('file', id);
        if (!file) {
            try {
                file = await this.store.findRecord('file', id);
            } catch {
                file = null;
            }
        }
        // update value and re-run compute
        this.value = file?.url ?? null;
        this.recompute();
    }
}
