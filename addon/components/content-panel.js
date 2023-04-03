import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class ContentPanelComponent extends Component {
    @tracked isOpen = false;

    @action toggle() {
        this.isOpen = !this.isOpen;
    }

    @action open() {
        this.isOpen = true;
    }

    @action close() {
        this.isOpen = false;
    }

    @action setupComponent() {
        const { onInsert, open } = this.args;

        this.isOpen = open;

        if (typeof onInsert === 'function') {
            onInsert(...arguments);
        }
    }
}
