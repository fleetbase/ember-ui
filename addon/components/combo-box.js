import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, get } from '@ember/object';

export default class ComboBoxComponent extends Component {
    // The constructor assigns options and selected before anything reads them, so their
    // initializers never produce the value that survives.
    /* istanbul ignore next */
    @tracked options = [];
    @tracked pending = [];
    @tracked unpending = [];
    /* istanbul ignore next */
    @tracked selected = [];

    constructor() {
        super(...arguments);

        this.options = this.filterOptions(this.args.options, this.args.selected);
        this.selected = this.filterSelected(this.args.selected, this.options);
    }

    filterOptions(options = [], selected = []) {
        const { comparator } = this.args;

        return options.filter((option) => {
            if (comparator) {
                return !selected.find((selection) => {
                    return get(selection, comparator) === get(option, comparator);
                });
            }

            return !selected.includes(option);
        });
    }

    // The only caller passes this.options, which the line above it has just assigned an array to.
    filterSelected(selected = [], /* istanbul ignore next */ options = []) {
        const { comparator } = this.args;

        return selected.filter((selection) => {
            if (comparator) {
                return !options.find((option) => {
                    return get(selection, comparator) === get(option, comparator);
                });
            }

            return !options.includes(selection);
        });
    }

    @action confirmPending() {
        this.options = this.options.filter((option) => !this.pending.includes(option));
        this.selected = [...this.selected, ...this.pending];
        this.pending = [];

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selected);
        }
    }

    @action confirmUnpending() {
        this.selected = this.selected.filter((selection) => !this.unpending.includes(selection));
        this.options = [...this.options, ...this.unpending];
        this.unpending = [];

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.selected);
        }
    }

    @action toggleSelection(index) {
        const selection = this.selected[index];

        if (this.unpending.includes(selection)) {
            this.unpending = this.unpending.filter((pendingSelection) => pendingSelection !== selection);
        } else {
            this.unpending = [...this.unpending, selection];
        }
    }

    @action toggleOption(index) {
        const option = this.options[index];

        if (this.pending.includes(option)) {
            this.pending = this.pending.filter((pendingOption) => pendingOption !== option);
        } else {
            this.pending = [...this.pending, option];
        }
    }
}
