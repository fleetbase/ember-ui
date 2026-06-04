import Component from '@glimmer/component';

export default class ChatTrayComposePanelComponent extends Component {
    get hasUsers() {
        return (this.args.users ?? []).length > 0;
    }

    get hasSelectedUsers() {
        return (this.args.selectedUsers ?? []).length > 0;
    }
}
