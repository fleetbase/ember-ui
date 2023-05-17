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
    constructor() {
        super(...arguments);

        this.isToggled = this.args.isToggled === true;

        if (typeof this.args.activeColor === 'string' && this.args.activeColor.length) {
            this.activeColor = this.args.activeColor;
        }
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
}
