import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

export default class CheckboxComponent extends Component {
    /**
     * Generates a unique ID for this checkbox instance
     *
     * @var {String}
     */
    @computed('args.id') get id() {
        const { id } = this.args;

        if (id) {
            return id;
        }

        return guidFor(this);
    }

    /**
     * Whether this checkbox is checked or not
     *
     * @param {Boolean} checked
     */
    @tracked checked = false;

    /**
     * The color class to use for the checkbox
     *
     * @param {String} colorClass
     */
    @tracked colorClass = 'text-sky-500';

    /**
     * Toggles the checkbox and sends up an action
     *
     * @void
     */
    @action toggle(event) {
        const { onToggle, onChange } = this.args;
        const { target } = event;
        const { checked } = target;

        this.checked = checked;

        if (typeof onToggle === 'function') {
            onToggle(checked, target);
        }

        if (typeof onChange === 'function') {
            onChange(checked, event);
        }
    }
}
