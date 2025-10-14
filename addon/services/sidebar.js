import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SidebarService extends Service {
    @tracked context;

    setSidbarContext(context) {
        this.context = context;
    }

    @action hide() {
        this.context?.hide();
    }

    @action hideNow() {
        this.context?.hideNow();
    }

    @action show() {
        this.context?.show();
    }

    @action minimize() {
        this.context?.minimize();
    }

    getComponent() {
        return this.context?.component;
    }

    getElement() {
        return this.context?.component?.siderbarNode;
    }

    getGutterElement() {
        return this.context?.component?.gutterNode;
    }
}
