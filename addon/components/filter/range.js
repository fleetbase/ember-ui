import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class FilterRangeComponent extends Component {
    @tracked minValue;
    @tracked maxValue;

    constructor() {
        super(...arguments);
        this.parseValue(this.args.value);
    }

    parseValue(value) {
        const { filter } = this.args;
        const { min = 0, max = 100 } = filter;

        if (typeof value === 'string' && value.includes(',')) {
            const [minVal, maxVal] = value.split(',').map((v) => parseFloat(v.trim()));
            this.minValue = isNaN(minVal) ? min : minVal;
            this.maxValue = isNaN(maxVal) ? max : maxVal;
        } else {
            this.minValue = min;
            this.maxValue = max;
        }
    }

    buildValue() {
        return `${this.minValue},${this.maxValue}`;
    }

    @action onMinChange(event) {
        const { onChange, filter } = this.args;
        const value = parseFloat(event.target.value);

        this.minValue = value;

        // Ensure min doesn't exceed max
        if (this.minValue > this.maxValue) {
            this.maxValue = this.minValue;
        }

        if (typeof onChange === 'function') {
            onChange(filter, this.buildValue());
        }
    }

    @action onMaxChange(event) {
        const { onChange, filter } = this.args;
        const value = parseFloat(event.target.value);

        this.maxValue = value;

        // Ensure max doesn't go below min
        if (this.maxValue < this.minValue) {
            this.minValue = this.maxValue;
        }

        if (typeof onChange === 'function') {
            onChange(filter, this.buildValue());
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.minValue = filter.min ?? 0;
        this.maxValue = filter.max ?? 100;

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
