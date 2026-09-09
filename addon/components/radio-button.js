import Component from '@glimmer/component';
import { action } from '@ember/object';
import { isEqual } from '@ember/utils';

/**
 * A radio button bound to a group value.
 *
 * This is a native replacement for the `ember-radio-button` addon, which was pinned to a
 * prerelease (3.0.0-beta.1) because its last stable release references the removed `Ember` global
 * and throws on Ember 5. The component name, arguments and rendered DOM are identical, so call
 * sites and stylesheets did not change.
 *
 * Arguments (all optional except `@value` and `@groupValue`):
 *   @value        this button's value
 *   @groupValue   the currently selected value; the button is checked when the two are equal
 *   @changed      called with this button's value when it becomes selected
 *   @name @disabled @required @autofocus @tabindex   forwarded to the input
 *   @radioClass   class for the input, @radioId its id
 *   @classNames   extra classes for the wrapping label (string or array)
 *   @checkedClass class added to the label while checked, default "checked"
 *   @ariaLabelledby @ariaDescribedby
 *
 * With a block it renders a `<label class="ember-radio-button">` wrapping the input and the block;
 * without one, just the input.
 */
export default class RadioButtonComponent extends Component {
    get joinedClassNames() {
        const classNames = this.args.classNames;

        if (classNames && classNames.length && classNames.join) {
            return classNames.join(' ');
        }

        return classNames;
    }

    get checkedClass() {
        return this.args.checkedClass || 'checked';
    }

    get checked() {
        return isEqual(this.args.groupValue, this.args.value);
    }

    @action changed(newValue) {
        // A closure action is optional.
        if (this.args.changed) {
            this.args.changed(newValue);
        }
    }
}
