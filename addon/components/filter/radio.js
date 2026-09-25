import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { isArray } from '@ember/array';

/**
 * A filter for two or three exclusive states, such as "assigned / not
 * assigned": every option is visible as a radio, and an "any" choice (the
 * placeholder text) clears the filter. Options are `{ label, value }` like
 * the select filter's; values compare as strings so "true" and true match.
 */
export default class FilterRadioComponent extends Component {
    /* istanbul ignore next -- @tracked initializer: the constructor assigns `value` before
       anything reads it, so this lazy initializer is never invoked. */
    @tracked value = '';

    constructor(owner, { value }) {
        super(...arguments);
        this.value = value === undefined || value === null ? '' : String(value);
    }

    get name() {
        return `filter-radio-${guidFor(this)}`;
    }

    get choices() {
        const optionLabel = this.args.optionLabel ?? this.args.filterOptionLabel ?? 'label';
        const optionValue = this.args.optionValue ?? this.args.filterOptionValue ?? 'value';
        const options = (isArray(this.args.options) ? this.args.options : []).map((option) =>
            typeof option === 'object' && option !== null ? { label: option[optionLabel], value: String(option[optionValue]) } : { label: String(option), value: String(option) }
        );

        return [{ label: this.args.anyLabel ?? this.args.placeholder ?? 'Any', value: '' }, ...options];
    }

    @action select(value) {
        const { onChange, filter } = this.args;

        this.value = value;

        if (typeof onChange === 'function') {
            onChange(filter, value === '' ? null : value);
        }
    }
}
