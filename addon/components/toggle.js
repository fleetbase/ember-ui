import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class ToggleComponent extends Component {
    /**
     * The active color of the toggle
     *
     * @var {Boolean}
     */
    @tracked isToggled = false;

    /**
     * The active color of the toggle
     *
     * @var {String}
     */
    @tracked activeColor = 'green';

    /**
     * The active color class.
     * Defaults to `bg-green-400` but could also be:
     * `bg-organge-400` `bg-yellow-400` `bg-red-400` `bg-blue-400`
     *
     * @var {String}
     */
    @computed('activeColor') get activeColorClass() {
        return `bg-${this.activeColor}-400`;
    }

    /**
     * Creates an instance of ToggleComponent.
     *
     * @memberof ToggleComponent
     */
    constructor(owner, { isToggled, activeColor }) {
        super(...arguments);

        this.isToggled = isToggled === true;
        this.activeColor = typeof activeColor === 'string' ? activeColor : 'green';
    }

    /**
     * Event for on/of toggle
     *
     * @void
     */
    @action toggle(isToggled) {
        const { disabled, onToggle } = this.args;
        if (disabled) {
            return;
        }

        this.isToggled = !isToggled;

        if (typeof onToggle === 'function') {
            onToggle(this.isToggled);
        }
    }

    /**
     * Handle toggle argument change.
     *
     * @param {HTMLElement} el
     * @param {Array} [isToggled]
     * @memberof ToggleComponent
     */
    @action onChange(el, [isToggled]) {
        this.isToggled = isToggled === true;
    }
}
