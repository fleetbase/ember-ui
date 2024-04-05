import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ChatTrayComponent extends Component {
    @service chat;
    @service socket;
    @tracked channels = [];

    constructor() {
        super(...arguments);
        this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
            },
        });
    }

    @action openChannel(chatChannelRecord) {
        this.chat.openChannel(chatChannelRecord);
        this.reloadChannels();
    }

    @action startChat() {
        this.chat.createChatChannel('Untitled Chat').then((chatChannelRecord) => {
            this.openChannel(chatChannelRecord);
        });
    }

    @action removeChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.reloadChannels();
    }

    @action updateChatChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.reloadChannels();
    }

    reloadChannels() {
        this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
            },
        });
    }
}
