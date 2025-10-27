import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { next } from '@ember/runloop';

export default class QueryBuilderLimitComponent extends Component {
    @tracked limit = null;

    constructor() {
        super(...arguments);
        this.limit = this.args.limit || 50;

        // set detault limit
        next(() => this.setLimit(this.limit));
    }

    get quickLimits() {
        return [
            { value: 10, label: '10' },
            { value: 25, label: '25' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
            { value: 250, label: '250' },
            { value: 500, label: '500' },
            { value: 1000, label: '1K' },
            { value: 5000, label: '5K' },
        ];
    }

    @action setLimit(value) {
        const numValue = parseInt(value, 10);
        this.limit = isNaN(numValue) || numValue <= 0 ? null : numValue;
        this.notifyChange();
    }

    @action setQuickLimit(value) {
        this.limit = value;
        this.notifyChange();
    }

    @action clearLimit() {
        this.limit = null;
        this.notifyChange();
    }

    notifyChange() {
        if (this.args.onChange) {
            this.args.onChange(this.limit);
        }
    }
}
