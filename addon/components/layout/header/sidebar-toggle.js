import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutHeaderSidebarToggleComponent extends Component {
    @service sidebar;

    get isDisabled() {
        return this.args.disabled === true || this.sidebar.isDisabled;
    }

    @action toggleSidebar() {
        if (this.isDisabled) return;

        this.sidebar.toggle();
        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.sidebar, this.sidebar.isVisible);
        }
    }
}
