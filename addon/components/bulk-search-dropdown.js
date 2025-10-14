import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BulkSearchDropdownComponent extends Component {
    @tracked value = '';

    constructor(owner, { value = '' }) {
        super(...arguments);
        this.value = value;
    }

    @action clear() {
        this.value = '';

        if (typeof this.args.onClear === 'function') {
            this.args.onClear(this.value);
        }
    }

    @action submit() {
        if (typeof this.args.onSubmit === 'function') {
            this.args.onSubmit(this.value);
        }
    }
}
