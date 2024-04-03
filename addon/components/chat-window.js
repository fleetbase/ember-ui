import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ChatWindowComponent extends Component {
    @service chat;
    @service currentUser;
    @tracked channel;
    @tracked sender;
    @tracked pendingMessageContent = '';

    constructor(owner, { channel }) {
        super(...arguments);
        this.channel = channel;
        this.sender = this.getSenderFromParticipants(channel);
    }

    @action sendMessage() {
        this.chat.sendMessage(this.channel, this.sender, this.pendingMessageContent);
        this.pendingMessageContent = '';
    }

    @action closeChannel() {
        this.chat.closeChannel(this.channel);
    }

    @action addParticipant() {}

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        console.log('#participants', participants);
        const sender = participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });

        return sender;
    }
}
