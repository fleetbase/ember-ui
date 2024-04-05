import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class ChatTrayComponent extends Component {
    @service chat;
    @service socket;
    @tracked channels = [];

    constructor(owner) {
        super(...arguments);
        this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
            },
        });
    }

    @action openChannel(chatChannelRecord) {
        this.chat.openChannel(chatChannelRecord);
    }

    @action startChat() {
        this.openChannel(chatChannelRecord);
    }

    @action removeChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.chat.loadChannels();
    }

    @action updateChatChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.chat.loadChannels();
    }
}
