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

    @action select(event) {
        const {
            target: { value },
        } = event;

        this.selected = value;

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(value);
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(event, value);
        }
    }
}
