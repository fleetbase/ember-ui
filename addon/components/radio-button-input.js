import Component from '@glimmer/component';
import { once } from '@ember/runloop';
import { action } from '@ember/object';

/**
 * The `<input type="radio">` itself.
 *
 * A native replacement for `ember-radio-button`'s component of the same name, kept API- and
 * DOM-identical so existing call sites and CSS are unaffected. See `radio-button.js`.
 */
export default class RadioButtonInputComponent extends Component {
    /**
     * `aria-checked` wants a string, and only when `checked` is genuinely boolean — an undefined
     * `@checked` must leave the attribute off rather than render "undefined".
     */
    get checkedStr() {
        const checked = this.args.checked;

        if (typeof checked === 'boolean') {
            return checked.toString();
        }

        return null;
    }

    @action change() {
        if (this.args.groupValue !== this.args.value) {
            // Scheduled rather than called directly: a radio group swaps two inputs in the same
            // interaction, and `once` collapses that into a single report of the new value.
            once(this.args, 'changed', this.args.value);
        }
    }
}
