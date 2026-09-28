import { tracked } from '@glimmer/tracking';
import StubEventedService from '../utils/stub-evented-service';

/**
 * Stub of the host console's `chat` service. Maintains an in-memory `openChannels` array,
 * creates deterministic channel records, and records every call on `calls`.
 */
export default class ChatService extends StubEventedService {
    calls = [];

    @tracked openChannels = [];

    nextChannelId = 1;

    /** Pseudo ember-concurrency task: `this.chat.loadChannels.perform({ withChannels })`. */
    loadChannels = {
        isRunning: false,
        isIdle: true,
        perform: (options = {}) => {
            this.calls.push({ method: 'loadChannels.perform', args: [options] });
            if (typeof options.withChannels === 'function') {
                options.withChannels([]);
            }
            return Promise.resolve([]);
        },
    };

    restoreOpenedChats() {
        this.calls.push({ method: 'restoreOpenedChats', args: [] });
    }

    openChannel(chatChannelRecord) {
        this.calls.push({ method: 'openChannel', args: [chatChannelRecord] });
        if (chatChannelRecord && !this.openChannels.includes(chatChannelRecord)) {
            this.openChannels = [...this.openChannels, chatChannelRecord];
        }
        this.trigger('chat.opened', chatChannelRecord);
    }

    closeChannel(chatChannelRecord) {
        this.calls.push({ method: 'closeChannel', args: [chatChannelRecord] });
        this.openChannels = this.openChannels.filter((channel) => channel !== chatChannelRecord);
        this.trigger('chat.closed', chatChannelRecord);
    }

    createChatChannel(name, participants = []) {
        this.calls.push({ method: 'createChatChannel', args: [name, participants] });
        const channel = {
            id: `test-chat-channel-${this.nextChannelId}`,
            public_id: `chat_channel_test_${this.nextChannelId}`,
            name,
            participants: [],
            messages: [],
            feed: [],
            unread_count: 0,
        };
        this.nextChannelId++;
        return Promise.resolve(channel);
    }

    updateChatChannel(chatChannelRecord, attributes = {}) {
        this.calls.push({ method: 'updateChatChannel', args: [chatChannelRecord, attributes] });
        Object.assign(chatChannelRecord ?? {}, attributes);
        return Promise.resolve(chatChannelRecord);
    }

    deleteChatChannel(chatChannelRecord) {
        this.calls.push({ method: 'deleteChatChannel', args: [chatChannelRecord] });
        return Promise.resolve(chatChannelRecord);
    }

    sendMessage(chatChannelRecord, sender, content, attachments = []) {
        this.calls.push({ method: 'sendMessage', args: [chatChannelRecord, sender, content, attachments] });
        return Promise.resolve({ id: 'test-chat-message-1', content, attachments });
    }

    addParticipant(chatChannelRecord, user) {
        this.calls.push({ method: 'addParticipant', args: [chatChannelRecord, user] });
        return Promise.resolve({ id: 'test-chat-participant-1', user_uuid: user?.id ?? 'test-user-1' });
    }

    removeParticipant(chatChannelRecord, participant) {
        this.calls.push({ method: 'removeParticipant', args: [chatChannelRecord, participant] });
        return Promise.resolve(participant);
    }

    insertChatMessageFromSocket(chatChannelRecord, data) {
        this.calls.push({ method: 'insertChatMessageFromSocket', args: [chatChannelRecord, data] });
    }

    insertChatLogFromSocket(chatChannelRecord, data) {
        this.calls.push({ method: 'insertChatLogFromSocket', args: [chatChannelRecord, data] });
    }

    insertChatAttachmentFromSocket(chatChannelRecord, data) {
        this.calls.push({ method: 'insertChatAttachmentFromSocket', args: [chatChannelRecord, data] });
    }

    insertChatReceiptFromSocket(chatChannelRecord, data) {
        this.calls.push({ method: 'insertChatReceiptFromSocket', args: [chatChannelRecord, data] });
    }
}
