import Component from '@glimmer/component';
import { computed, action } from '@ember/object';
import { not, equal } from '@ember/object/computed';

export default class ButtonComponent extends Component {
    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @computed('args.{isLoading,disabled}') get isDisabled() {
        const { isLoading, disabled } = this.args;

        return disabled || isLoading;
    }

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @equal('args.type', 'secondary') isSecondary;

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @not('isSecondary') isNotSecondary;

    /**
     * Determines if icon be displayed
     *
     * @var {Boolean}
     */
    @computed('args.{icon,isLoading}') get showIcon() {
        const { icon, isLoading } = this.args;

        return icon && !isLoading;
    }

    /**
     * Setup this component
     *
     * @void
     */
    @action setupComponent() {
        const { onInsert } = this.args;

        if (typeof onInsert === 'function') {
            onInsert();
        }
    }

    /**
     * Dispatches the `onClick` event with all arguments.
     * If button `this.isDisable` then event is not executed.
     *
     * @void
     */
    @action onClick() {
        const { onClick } = this.args;

        if (this.isDisabled) {
            return;
        }

        if (typeof onClick === 'function') {
            onClick(...arguments);
        }
    }
}
