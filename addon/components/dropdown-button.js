import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { action } from '@ember/object';

export default class DropdownButtonComponent extends Component {
    @service abilities;

    // Optional events service; undefined when the host app does not register one.
    get events() {
        return getOwner(this).lookup('service:events');
    }
    @tracked type = 'default';
    @tracked buttonSize = 'md';
    @tracked buttonComponentArgs = {};
    @tracked _onInsertFired = false;
    @tracked _onTriggerInsertFired = false;
    @tracked _onButtonInsertFired = false;
    @tracked disabled = false;
    @tracked visible = true;
    @tracked permissionRequired = false;
    @tracked doesntHavePermissions = false;

    /**
     * Creates an instance of DropdownButtonComponent.
     * @param {ApplicationInstance} owner
     * @param {Object} { type = 'default', size = 'md', buttonComponentArgs = {}}
     * @memberof DropdownButtonComponent
     */
    constructor(owner, { type = 'default', size = 'md', buttonComponentArgs = {}, permission = null, disabled = false, visible = true }) {
        super(...arguments);

        this.type = type;
        this.buttonSize = size;
        this.buttonComponentArgs = buttonComponentArgs;
        this.permissionRequired = permission;
        this.disabled = disabled;
        this.visible = visible;
        // If no permissions disable
        if (!disabled && permission) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }
    }

    @action onRegisterAPI(dropdown) {
        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(dropdown);
        }
    }

    /**
     * Tracking hangs off `@onOpen`, which ember-basic-dropdown fires for EVERY open however it
     * was reached. The previous approach monkey-patched `dropdown.actions.open`, but the
     * trigger calls `toggle`, which closes over the original `open` internally — so an
     * ordinary user click was never tracked, only a programmatic `api.actions.open()`.
     */
    @action onOpen() {
        const { eventName, eventArgs, onOpen } = this.args;

        if (eventName && this.events) {
            this.events.trackEvent(eventName, ...(eventArgs || []));
        }

        if (typeof onOpen === 'function') {
            return onOpen(...arguments);
        }
    }

    @action onTriggerInsert() {
        if (typeof this.args.onTriggerInsert === 'function') {
            this.args.onTriggerInsert(...arguments);
        }

        this._onTriggerInsertFired = true;

        // Fallback for insert, when `renderInPlace=false` Trigger becomes whole node
        if (this.args.renderInPlace === true || this._onInsertFired === false) {
            this.onInsert(...arguments);
        }
    }

    @action onButtonInsert() {
        if (typeof this.args.onButtonInsert === 'function') {
            this.args.onButtonInsert(...arguments);
        }

        this._onButtonInsertFired = true;
    }

    @action onInsert() {
        if (typeof this.args.onInsert === 'function') {
            this.args.onInsert(...arguments);
        }

        this._onInsertFired = true;
    }

    @action onArgsChanged(el, [disabled = false, visible = true, permission = null, buttonComponentArgs = {}]) {
        this.buttonComponentArgs = buttonComponentArgs;
        this.visible = visible;
        this.disabled = disabled;
        if (!disabled && permission) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }
    }
}
