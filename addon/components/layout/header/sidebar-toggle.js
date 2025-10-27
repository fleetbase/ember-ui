import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class LayoutHeaderSidebarToggleComponent extends Component {
    @service universe;
    @service sidebar;
    @tracked isSidebarVisible = true;

    @action toggleSidebar() {
        if (this.args.disabled === true) return;

        if (this.isSidebarVisible) {
            this.sidebar.hideNow();
        } else {
            this.sidebar.show();
        }

        this.isSidebarVisible = !this.isSidebarVisible;
        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.sidebar, this.isSidebarVisible);
        }
    }
}
