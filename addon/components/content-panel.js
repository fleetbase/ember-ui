import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';

export default class ContentPanelComponent extends Component {
    @tracked isOpen = false;

    constructor() {
        super(...arguments);

        this.isOpen = this.args.open === true;

        if (typeof this.args.onInsert === 'function') {
            this.args.onInsert(...arguments);
        }
    }

    @action toggle() {
        this.isOpen = !this.isOpen;
    }

    @action open() {
        this.isOpen = true;
    }

    @action close() {
        this.isOpen = false;
    }
}
