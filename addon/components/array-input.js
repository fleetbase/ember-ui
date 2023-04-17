import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ArrayInputComponent extends Component {
    @tracked data = [];

    constructor() {
        super(...arguments);

        this.data = this.args.data ?? [];
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
        this.data.pushObject('');

        if (typeof this.args.onDataChanged === 'function') {
            this.args.onDataChanged(this.data);
        }
    }

    @action removeData(index) {
        this.data.removeAt(index);

        if (typeof this.args.onDataChanged === 'function') {
            this.args.onDataChanged(this.data);
        }
    }
}
