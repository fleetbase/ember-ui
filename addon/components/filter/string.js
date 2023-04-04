import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterStringComponent extends Component {
    @action setupComponent() {}

    @action onChange({ target: { value } }) {
        const { onChange } = this.args;

        if (typeof onChange === 'function') {
            onChange(value);
        }
    }
}
