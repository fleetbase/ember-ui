import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { computed, action } from '@ember/object';
import { not, equal } from '@ember/object/computed';

export default class ButtonComponent extends Component {
    /**
     * Inject abilities service.
     *
     * @memberof ButtonComponent
     */
    @service abilities;

    /**
     * Optional events service for event tracking. Resolved via the owner so
     * host applications that do not register an `events` service still work.
     *
     * @memberof ButtonComponent
     */
    get events() {
        return getOwner(this).lookup('service:events');
    }

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @computed('args.{disabled,disabledByPermission,isLoading}', 'disabledByPermission') get isDisabled() {
        const { isLoading, disabled } = this.args;

        return this.disabledByPermission || disabled || isLoading;
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
     * The permission required.
     *
     * @memberof ButtonComponent
     */
    @tracked permissionRequired;

    /**
     * If the button is disabled by permissions.
     *
     * @memberof ButtonComponent
     */
    @tracked disabledByPermission = false;

    /**
     * Determines the visibility of the button
     *
     * @memberof ButtonComponent
     */
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked visible = true;

    /**
     * Creates an instance of ButtonComponent.
     * @param {*} owner
     * @param {*} { permission = null }
     * @memberof ButtonComponent
     */
    constructor(owner, { permission = null, disabled = false, visible = true }) {
        super(...arguments);
        this.permissionRequired = permission;
        this.visible = visible;
        if (!disabled && permission) {
            this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
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
        const { onClick, eventName, eventArgs } = this.args;

        /* istanbul ignore if -- button.hbs sets disabled={{this.isDisabled}} on the button, so a
           disabled one cannot be clicked */
        if (this.isDisabled) {
            return;
        }

        // Trigger analytics event if eventName is provided
        if (eventName && this.events) {
            const args = eventArgs || [];
            this.events.trackEvent(eventName, ...args);
        }

        if (typeof onClick === 'function') {
            onClick(...arguments);
        }
    }

    @action onArgsChanged(el, [disabled = false, visible = true, permission = null]) {
        this.permissionRequired = permission;
        this.visible = visible;
        if (!disabled && permission) {
            this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
    }
}
