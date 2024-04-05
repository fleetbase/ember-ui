import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ChatWindowComponent extends Component {
    @service chat;
    @service socket;
    @service currentUser;
    @service modalsManager;
    @service fetch;
    @service store;
    @tracked channel;
    @tracked sender;
    @tracked senderIsCreator;
    @tracked availableUsers = [];
    @tracked pendingMessageContent = '';

    constructor(owner, { channel }) {
        super(...arguments);
        this.channel = channel;
        this.sender = this.getSenderFromParticipants(channel);
        this.listenChatChannel(channel);
        this.loadAvailableUsers.perform();
    }

    async listenChatChannel(chatChannelRecord) {
        this.socket.listen(`chat.${chatChannelRecord.public_id}`, (socketEvent) => {
            console.log('[chat event]', socketEvent);
            switch (socketEvent.event) {
                case 'chat.added_participant':
                case 'chat.removed_participant':
                    this.channel.reloadParticipants();
                    break;
                case 'chat_message.created':
                    // this.channel.reloadParticipants();
                    this.chat.insertMessageFromSocket(this.channel, socketEvent.data);
                    break;
            }
        });
    }

    @action sendMessage() {
        this.chat.sendMessage(this.channel, this.sender, this.pendingMessageContent);
        this.pendingMessageContent = '';
    }

    @action closeChannel() {
        this.chat.closeChannel(this.channel);
    }

    @action addParticipant(user) {
        this.chat.addParticipant(this.channel, user);
    }

    @action removeParticipant(participant) {
        this.modalsManager.confirm({
            title: `Are you sure you wish to remove this participant (${participant.name}) from the chat?`,
            body: 'Proceeding remove this participant from the chat.',
            confirm: (modal) => {
                modal.startLoading();

                return this.chat.removeParticipant(this.channel, participant);
            },
        });
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

    @task *loadAvailableUsers(params = {}) {
        const users = yield this.store.query('user', params);
        this.availableUsers = users;
        return users;
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        const sender = participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });

        this.senderIsCreator = sender ? sender.id === channel.created_by_uuid : false;
        return sender;
    }
}
