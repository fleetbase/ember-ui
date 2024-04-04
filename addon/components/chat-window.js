import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ChatWindowComponent extends Component {
    @service chat;
    @service currentUser;
    @tracked channel;
    @tracked sender;
    @tracked senderIsCreator;
    @tracked pendingMessageContent = '';

    constructor(owner, { channel }) {
        super(...arguments);
        this.channel = channel;
        this.sender = this.getSenderFromParticipants(channel);
        this.senderIsCreator = this.sender ? this.sender.id === channel.created_by_uuid : false;
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

        // reposition when chat is closed
        this.chat.on('chat.closed', () => {
            this.positionWindow(chatWindowElement);
        });
    }

    @action autoScrollMessagesWindow(messagesWindowContainerElement) {
        messagesWindowContainerElement.scrollTop = messagesWindowContainerElement.scrollHeight;
        setInterval(() => {
            messagesWindowContainerElement.scrollTop = messagesWindowContainerElement.scrollHeight;
        }, 1000);
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        const sender = participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });

        return sender;
    }
}
