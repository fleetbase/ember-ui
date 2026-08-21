import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';

// The documented default; also used by getSize() so the constructor never has to read the
// tracked field it is about to write.
const DEFAULT_SIZE = 8;

export default class LogoIconComponent extends Component {
    @service store;
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked size = DEFAULT_SIZE;
    @tracked brand;
    @tracked ready = false;

    sizeMap = {
        4: 16,
        5: 20,
        8: 32,
        10: 40,
        12: 48,
        16: 64,
        20: 80,
    };

    @computed('size', 'sizeMap') get px() {
        return this.sizeMap[this.size];
    }

    constructor() {
        super(...arguments);
        this.size = this.getSize();

        if (isBlank(this.args.brand)) {
            this.loadIcon.perform();
        } else {
            this.brand = this.args.brand;
            this.ready = true;
        }
    }

    getSize() {
        const size = this.args.size;

        if (size) {
            return parseInt(size);
        }

        // Must NOT read `this.size` here: the constructor assigns the result straight back to
        // it, and reading-then-writing a tracked property in one computation raises
        // "You attempted to update `size` … but it had already been used previously in the
        // same computation", which left the component rendering nothing.
        return DEFAULT_SIZE;
    }

    @task *loadIcon() {
        try {
            this.brand = yield this.store.findRecord('brand', 1);
            this.ready = true;
        } catch {
            this.ready = true;
        }
    }
}
