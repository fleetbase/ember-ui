import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

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
        const chatChannelRecord = this.chat.createChatChannel();
        this.openChannel(chatChannelRecord);
    }
}
