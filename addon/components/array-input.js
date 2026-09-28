import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ArrayInputComponent extends Component {
    /* istanbul ignore next -- the constructor assigns both before anything reads them. */
    @tracked data = [];
    /* istanbul ignore next -- see above. */
    @tracked disabled = false;

    constructor(owner, { data = [], disabled = false }) {
        super(...arguments);

        this.data = data;
        this.disabled = disabled;
    }

    @action onChange(index, event) {
        const value = event?.target?.value;

        if (value) {
            this.inputDatum(index, value);
        }
    }

    @action onPaste(index, event) {
        const value = event?.target?.value;

        if (value) {
            this.inputDatum(index, value);
        }
    }

    @action inputDatum(index, input) {
        this.data[index] = input;

        if (typeof this.args.onDataChanged === 'function') {
            this.args.onDataChanged(this.data);
        }
    }

    @action addData() {
        this.data = [...this.data, ''];

        if (typeof this.args.onDataChanged === 'function') {
            this.args.onDataChanged(this.data);
        }
    }

    @action removeData(index) {
        this.data = this.data.filter((_, i) => i !== index);

        if (typeof this.args.onDataChanged === 'function') {
            this.args.onDataChanged(this.data);
        }
    }
}
