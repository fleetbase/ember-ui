import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { isBlank, isNone } from '@ember/utils';
import { task } from 'ember-concurrency';
import noop from '../utils/noop';

export default class ChatTrayComponent extends Component {
    @service chat;
    @service socket;
    @service fetch;
    @service store;
    @service modalsManager;
    @service currentUser;
    @service media;
    @service notifications;
    @tracked channels = [];
    @tracked unreadCount = 0;
    @tracked isInboxOpen = false;
    @tracked isComposeOpen = false;
    @tracked searchQuery = '';
    @tracked contactSearchQuery = '';
    @tracked availableUsers = [];
    @tracked selectedUsers = [];
    @tracked newChatName = '';
    @tracked notificationSound = new Audio('/sounds/message-notification-sound.mp3');

    constructor() {
        super(...arguments);
        this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
                this.countUnread(channels);
                this.listenAllChatChannels(channels);
                this.listenUserChannel();
            },
        });
    }

    get inboxWidth() {
        return this.media.isMobile ? '100%' : '420px';
    }

    get composeWidth() {
        return this.media.isMobile ? '100%' : '360px';
    }

    get filteredChannels() {
        const query = this.searchQuery.trim().toLowerCase();
        const channels = [...(this.channels ?? [])].sort((a, b) => {
            const aUnread = a.unread_count ?? 0;
            const bUnread = b.unread_count ?? 0;

            if (aUnread !== bUnread) {
                return bUnread - aUnread;
            }

            return new Date(b.updated_at ?? b.created_at ?? 0) - new Date(a.updated_at ?? a.created_at ?? 0);
        });

        if (isBlank(query)) {
            return channels;
        }

        return channels.filter((channel) => this.channelMatchesQuery(channel, query));
    }

    get selectedUserIds() {
        return this.selectedUsers.map((user) => user.id);
    }

    get canCreateChat() {
        return this.selectedUsers.length > 0 && this.createChat.isIdle;
    }

    get defaultNewChatName() {
        if (this.selectedUsers.length === 1) {
            return this.selectedUsers[0].name;
        }

        if (this.selectedUsers.length > 1) {
            return this.selectedUsers.map((user) => user.name).join(', ');
        }

        return 'Untitled Chat';
    }

    listenAllChatChannels(channels) {
        channels.forEach((chatChannelRecord) => {
            this.listenChatChannel(chatChannelRecord);
        });
    }

    async listenUserChannel() {
        this.socket.listen(`user.${this.currentUser.id}`, (socketEvent) => {
            const { event, data } = socketEvent;
            switch (event) {
                case 'chat.participant_added':
                case 'chat_participant.created':
                    this.reloadChannels();
                    break;
                case 'chat.participant_removed':
                case 'chat_participant.deleted':
                    this.reloadChannels();
                    this.closeChannelIfRemovedFromParticipants(data);
                    break;
                case 'chat_channel.created':
                    this.reloadChannels({ relisten: true });
                    this.openNewChannelAsParticipant(data);
                    break;
                case 'chat_channel.deleted':
                    this.reloadChannels({ relisten: true });
                    this.closeChannelIfOpen(data);
                    break;
            }
        });
    }

    async listenChatChannel(chatChannelRecord) {
        this.socket.listen(`chat.${chatChannelRecord.public_id}`, (socketEvent) => {
            const { event, data } = socketEvent;
            switch (event) {
                case 'chat_message.created':
                    this.reloadChannels();
                    this.playSoundForIncomingMessage(chatChannelRecord, data);
                    break;
                case 'chat.added_participant':
                    this.reloadChannels();
                    break;
                case 'chat_participant.deleted':
                case 'chat.removed_participant':
                    this.reloadChannels();
                    this.closeChannelIfRemovedFromParticipants(data);
                    break;
                case 'chat_channel.created':
                    this.reloadChannels({ relisten: true });
                    this.openNewChannelAsParticipant(data);
                    break;
                case 'chat_channel.deleted':
                    this.reloadChannels({ relisten: true });
                    this.closeChannelIfOpen(data);
                    break;
                case 'chat_receipt.created':
                    this.reloadChannels({ relisten: true });
                    break;
            }
        });
    }

    @action openChannel(chatChannelRecord) {
        this.chat.openChannel(chatChannelRecord);
        this.closeInbox();
        this.reloadChannels({ relisten: true });
    }

    @action startChat() {
        this.isComposeOpen = true;
        this.loadAvailableUsers.perform();
    }

    @action toggleInbox() {
        if (this.isInboxOpen) {
            this.closeInbox();
        } else {
            this.openInbox();
        }
    }

    @action openInbox() {
        this.isInboxOpen = true;
        this.unlockAudio();
    }

    @action closeInbox() {
        this.isInboxOpen = false;
        this.isComposeOpen = false;
    }

    @action closeCompose() {
        this.isComposeOpen = false;
        this.selectedUsers = [];
        this.newChatName = '';
        this.contactSearchQuery = '';
    }

    @action setSearchQuery(event) {
        this.searchQuery = event.target.value;
    }

    @action setContactSearchQuery(event) {
        this.contactSearchQuery = event.target.value;
        this.loadAvailableUsers.perform({ query: this.contactSearchQuery });
    }

    @action setNewChatName(event) {
        this.newChatName = event.target.value;
    }

    @action toggleSelectedUser(user) {
        const exists = this.selectedUsers.find((selectedUser) => selectedUser.id === user.id);

        if (exists) {
            this.selectedUsers = this.selectedUsers.filter((selectedUser) => selectedUser.id !== user.id);
        } else {
            this.selectedUsers = [...this.selectedUsers, user];
        }
    }

    @action removeSelectedUser(user) {
        this.selectedUsers = this.selectedUsers.filter((selectedUser) => selectedUser.id !== user.id);
    }

    @action removeChannel(chatChannelRecord) {
        this.modalsManager.confirm({
            title: `Are you sure you wish to end this chat (${chatChannelRecord.title})?`,
            body: 'Once this chat is ended, it will no longer be accessible for anyone.',
            confirm: (modal) => {
                modal.startLoading();

                this.chat.closeChannel(chatChannelRecord);
                this.chat.deleteChatChannel(chatChannelRecord);
                return this.reloadChannels();
            },
        });
    }

    @action updateChatChannel(chatChannelRecord) {
        this.chat.deleteChatChannel(chatChannelRecord);
        this.reloadChannels();
    }

    @action async unlockAudio() {
        this.reloadChannels();
        try {
            this.notificationSound.play().catch(noop);
            this.notificationSound.pause();
            this.notificationSound.currentTime = 0;
        } catch (error) {
            noop();
        }
    }

    @task *getUnreadCount() {
        const { unreadCount } = yield this.fetch.get('chat-channels/unread-count');
        if (!isNone(unreadCount)) {
            this.unreadCount = unreadCount;
        }
    }

    @task *loadAvailableUsers(params = {}) {
        try {
            const users = yield this.fetch.get('chat-channels/available-participants', params, {
                normalizeToEmberData: true,
                normalizeModelType: 'user',
            });

            this.availableUsers = users;
            return users;
        } catch (error) {
            console.warn('Error loading chat participants:', error);
            this.availableUsers = [];
        }
    }

    @task *createChat() {
        if (this.selectedUsers.length === 0) {
            return;
        }

        try {
            const chatChannelRecord = yield this.chat.createChatChannel(this.newChatName.trim() || this.defaultNewChatName, this.selectedUserIds);
            this.closeCompose();
            this.openChannel(chatChannelRecord);
            this.reloadChannels({ relisten: true });
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to create chat.');
        }
    }

    playSoundForIncomingMessage(chatChannelRecord, data) {
        const sender = this.getSenderFromParticipants(chatChannelRecord);
        const isNotSender = sender ? sender.id !== data.sender_uuid : false;
        if (isNotSender) {
            this.notificationSound.play();
        }
    }

    getSenderFromParticipants(channel) {
        const participants = channel.participants ?? [];
        return participants.find((chatParticipant) => {
            return chatParticipant.user_uuid === this.currentUser.id;
        });
    }

    countUnread(channels) {
        this.unreadCount = channels.reduce((total, channel) => total + channel.unread_count, 0);
    }

    channelMatchesQuery(channel, query) {
        const lastMessage = channel.last_message;
        const searchable = [
            channel.title,
            channel.name,
            lastMessage?.content,
            ...(channel.participants ?? []).map((participant) => participant.name),
            ...(channel.participants ?? []).map((participant) => participant.email),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchable.includes(query);
    }

    reloadChannels(options = {}) {
        return this.chat.loadChannels.perform({
            withChannels: (channels) => {
                this.channels = channels;
                this.countUnread(channels);
                if (options && options.relisten === true) {
                    this.listenAllChatChannels(channels);
                }
            },
        });
    }

    openNewChannelAsParticipant(data) {
        const normalized = this.store.normalize('chat-channel', data);
        const channel = this.store.push(normalized);
        if (channel && this.getSenderFromParticipants(channel)) {
            this.notificationSound.play();
            this.openChannel(channel);
        }
    }

    closeChannelIfOpen(data) {
        const normalized = this.store.normalize('chat-channel', data);
        const channel = this.store.push(normalized);
        if (channel) {
            this.chat.closeChannel(channel);
        }
    }

    closeChannelIfRemovedFromParticipants(data) {
        const normalized = this.store.normalize('chat-participant', data);
        const removedChatParticipant = this.store.push(normalized);
        if (removedChatParticipant) {
            const channel = this.store.peekRecord('chat-channel', removedChatParticipant.chat_channel_uuid);
            if (channel) {
                this.chat.closeChannel(channel);
            }
        }
    }
}
