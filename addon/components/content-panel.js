import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

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

    @action onDropdownItemClick(action, dd) {
        if (typeof dd.actions === 'object' && typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        if (typeof action.fn === 'function') {
            action.fn(action.context);
        }

        if (typeof action.onClick === 'function') {
            action.onClick(action.context);
        }
    }
}
