import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ChatWindowComponent extends Component {
    @service chat;
    @service currentUser;
    @service fetch;
    @service store;
    @tracked channel;
    @tracked sender;
    @tracked senderIsCreator;
    @tracked participants;
    @tracked pendingMessageContent = '';

    constructor(owner, { channel }) {
        super(...arguments);
        this.channel = channel;
        this.sender = this.getSenderFromParticipants(channel);
        this.senderIsCreator = this.sender ? this.sender.id === channel.created_by_uuid : false;
        this.participants = this.loadUsers()
    }

    @action sendMessage() {
        this.chat.sendMessage(this.channel, this.sender, this.pendingMessageContent);
        this.pendingMessageContent = '';
    }

    @action closeChannel() {
        this.chat.closeChannel(this.channel);
    }

    @action loadUsers() {
        return this.store.query('driver', { limit: 25});
    }

    @action addParticipant(participant){
        console.log("Channels : ", this.channel, participant)
        this.chat.addParticipant(this.channel, participant)
    }

    @action removeParticipant(participant) {
        this.chat.removeParticipant(this.channel, participant);
    }

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
