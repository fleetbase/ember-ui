import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SelectComponent extends Component {
    @tracked value;
    @tracked placeholder;

    constructor(owner, { value, placeholder }) {
        super(...arguments);
        this.value = value;
        this.placeholder = placeholder;
    }

    @action changed(el, [value, placeholder]) {
        this.value = value;
        this.placeholder = placeholder;
    }

    @action select(event) {
        const { value } = event.target;

        this.value = value;

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(value);
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(event, value);
        }
    }
}
