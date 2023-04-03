import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class ToggleComponent extends Component {
    /**
     * The active color of the toggle
     *
     * @var {String}
     */
    activeColor = 'green';

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
     * If the toggle is on or off
     *
     * @var {Boolean}
     */
    @tracked _isToggled;

    /**
     * If the toggle is on or off
     *
     * @var {Boolean}
     */
    @computed('args.isToggled', '_isToggled') get isToggled() {
        if (this._isToggled !== undefined) {
            return this._isToggled;
        }

        return this.args.isToggled || false;
    }

    set isToggled(isToggled) {
        this._isToggled = isToggled;
    }

    /**
     * Event for on/of toggle
     *
     * @void
     */
    @action toggle(isToggled) {
        if (this.args.disabled) {
            return;
        }

        this.isToggled = isToggled === false ? true : false;

        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.isToggled);
        }
    }
}
