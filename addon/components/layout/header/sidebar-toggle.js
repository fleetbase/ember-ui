import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { tracked } from '@glimmer/tracking';

export default class LayoutHeaderSidebarToggleComponent extends Component {
    @service universe;
    @alias('universe.sidebarContext') sidebarContext;
    @tracked isSidebarVisible = true;

    @action toggleSidebar() {
        if (this.isSidebarVisible) {
            this.sidebarContext.hideNow();
        } else {
            this.sidebarContext.show();
        }
        this.isSidebarVisible = !this.isSidebarVisible;
    }
}
