import Component from '@glimmer/component';

export default class ChatTrayInboxPanelComponent extends Component {
    get hasChannels() {
        return (this.args.channels ?? []).length > 0;
    }
}
