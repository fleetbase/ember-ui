import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action } from '@ember/object';

export default class SelectComponent extends Component {
    @tracked selected;

    @computed('selected', 'args.value') get value() {
        if (this.selected) {
            return this.selected;
        }

        return this.args.value;
    }

    @computed('value', 'args.placeholder') get hasPlaceholder() {
        return !this.value && this.args.placeholder;
    }

    @action select({ target }) {
        const { value } = target;
        this.selected = value;

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(value);
        }
    }
}
