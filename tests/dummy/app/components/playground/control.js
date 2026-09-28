import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * One editable control. Renders the input appropriate to the control's declared type and reports
 * the raw value upward; coercion and validation belong to `playground/controls`, not here.
 */
export default class PlaygroundControlComponent extends Component {
    get definition() {
        return this.args.model.definition;
    }

    get inputId() {
        return `pg-${this.args.slug}-${this.definition.key}`;
    }

    get errorId() {
        return `${this.inputId}-error`;
    }

    /** JSON controls are edited as text, so the textarea needs a string. */
    get textValue() {
        const value = this.args.model.value;

        if (this.definition.type === 'json') {
            return value === null || value === undefined ? '' : JSON.stringify(value, null, 2);
        }

        return value ?? '';
    }

    @action onInput(event) {
        this.args.onChange(this.definition.key, event.target.value);
    }

    @action onToggle(event) {
        this.args.onChange(this.definition.key, event.target.checked);
    }

    @action onSelect(event) {
        // A select's DOM value is always a string; map it back to the declared option value so
        // `null` and numeric options survive the round trip.
        const index = event.target.selectedIndex;
        const option = this.definition.options[index];

        this.args.onChange(this.definition.key, option ? option.value : event.target.value);
    }
}
