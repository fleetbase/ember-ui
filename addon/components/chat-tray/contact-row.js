import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class ChatTrayContactRowComponent extends Component {
    get isSelected() {
        return (this.args.selectedUsers ?? []).some((user) => user.id === this.args.user?.id);
    }

    @action toggle() {
        if (typeof this.args.toggle === 'function') {
            this.args.toggle(this.args.user);
        }
    }
}
