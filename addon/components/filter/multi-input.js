import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class FilterMultiInputComponent extends Component {
    @tracked tags = [];

    constructor() {
        super(...arguments);
        this.tags = this.parseValue(this.args.value);
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            return value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        }

        if (value) {
            return [value];
        }

        return [];
    }

    buildValue() {
        return this.tags.join(',');
    }

    @action addTag(tag) {
        const { onChange, filter } = this.args;

        this.tags.pushObject(tag);
        const value = this.buildValue();

        if (typeof onChange === 'function') {
            onChange(filter, value);
        }
    }

    @action removeTag(index) {
        const { onChange, filter } = this.args;

        this.tags.removeAt(index);
        const value = this.buildValue();

        if (typeof onChange === 'function') {
            onChange(filter, value);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.tags = [];

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
