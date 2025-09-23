import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';

export default class ToggleComponent extends Component {
    @service abilities;
    @tracked isToggled = false;
    @tracked activeColor = 'green';
    @tracked permissionRequired;
    @tracked disabledByPermission = false;
    @tracked visible = true;
    @tracked disabled = false;

    @computed('activeColor') get activeColorClass() {
        return `bg-${this.activeColor}-400`;
    }

    constructor(owner, { value = false, isToggled = false, activeColor = 'green', permission = null, disabled = false, visible = true }) {
        super(...arguments);

        this.isToggled = isToggled;
        this.activeColor = activeColor;
        this.checked = value;
        this.permissionRequired = permission;
        this.visible = visible;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
    }

    @action toggle(isToggled) {
        if (this.disabled) return;

        this.isToggled = !isToggled;
        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.isToggled);
        }
    }

    @action onChange(el, [isToggled, disabled]) {
        this.isToggled = isToggled === true;
        this.disabled = disabled;
    }
}
