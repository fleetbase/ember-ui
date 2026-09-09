import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import toBoolean from '@fleetbase/ember-core/utils/to-boolean';

export default class FilterCheckboxComponent extends Component {
    /* istanbul ignore next -- @tracked initializer: the value is assigned before it is ever
       read, so this lazy initializer is never invoked. */
    @tracked value = false;

    constructor(owner, { value = false }) {
        super(...arguments);
        this.value = toBoolean(value);
    }

    @action onChange(checked) {
        const { onChange, filter } = this.args;

        this.value = checked;

        if (typeof onChange === 'function') {
            onChange(filter, checked);
        }
    }
}
