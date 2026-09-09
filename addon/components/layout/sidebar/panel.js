import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class LayoutSidebarPanelComponent extends Component {
    @service abilities;
    // The constructor assigns each of these before anything reads it.
    /* istanbul ignore next */
    @tracked dropdownButtonRenderInPlace = true;
    /* istanbul ignore next */
    @tracked permissionRequired = null;
    /* istanbul ignore next */
    @tracked disabled = false;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked doesntHavePermissions = false;
    /* istanbul ignore next */
    @tracked visible = true;

    constructor(owner, { dropdownButtonRenderInPlace = true, permission = null, disabled = false, visible = true }) {
        super(...arguments);
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace;
        this.permissionRequired = permission;
        this.disabled = disabled;
        this.visible = visible;
        // If no permissions disable
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }
    }
}
