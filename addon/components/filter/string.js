import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterStringComponent extends Component {
    @tracked value = '';

    constructor(owner, { value = '' }) {
        super(...arguments);
        this.value = value;
    }

    @action onChange({ target: { value } }) {
        const { onChange, filter } = this.args;

        this.value = value;

        if (typeof onChange === 'function') {
            onChange(filter, value);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.value = '';

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
