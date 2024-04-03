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

    @action positionWindow(chatWindowElement) {
        const chatWindowWidth = chatWindowElement.offsetWidth;
        const multiplier = this.chat.openChannels.length - 1;
        const marginRight = (chatWindowWidth + 20) * multiplier;
        chatWindowElement.style.marginRight = `${marginRight}px`;
    }

    @action autoScrollMessagesWindow(messagesWindowContainerElement) {
        messagesWindowContainerElement.scrollTop = messagesWindowContainerElement.scrollHeight;
        setInterval(() => {
            messagesWindowContainerElement.scrollTop = messagesWindowContainerElement.scrollHeight;
        }, 1000);
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        console.log('#participants', participants);
        const sender = participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });

        return sender;
    }
}
