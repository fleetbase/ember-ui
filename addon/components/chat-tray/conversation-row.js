import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ChatTrayConversationRowComponent extends Component {
    @service currentUser;

    get channel() {
        return this.args.channel;
    }

    get lastMessage() {
        return this.channel?.last_message;
    }

    get participants() {
        return this.channel?.participants ?? [];
    }

    get visibleParticipants() {
        return this.participants.slice(0, 3);
    }

    get hasVisibleParticipants() {
        return this.visibleParticipants.length > 0;
    }

    get extraParticipantCount() {
        return Math.max((this.participants.length ?? 0) - this.visibleParticipants.length, 0);
    }

    get title() {
        return this.channel?.title || this.channel?.name || 'Untitled Chat';
    }

    get preview() {
        const lastMessage = this.lastMessage;

        if (!lastMessage) {
            return 'No messages yet';
        }

        if (lastMessage.content) {
            return lastMessage.content;
        }

        const attachmentCount = lastMessage.attachments?.length ?? 0;
        return attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}` : 'Sent a message';
    }

    get senderName() {
        return this.lastMessage?.sender?.name;
    }

    get timestamp() {
        return this.lastMessage?.createdAgo || this.channel?.updatedAgo || this.channel?.createdAgo;
    }

    get unreadCount() {
        return this.channel?.unread_count ?? 0;
    }

    get hasAttachments() {
        return (this.lastMessage?.attachments?.length ?? 0) > 0;
    }

    get isCreator() {
        return this.channel?.created_by_uuid === this.currentUser.id;
    }

    get isOpen() {
        return this.args.isOpen === true;
    }

    @action open() {
        if (typeof this.args.open === 'function') {
            this.args.open(this.channel);
        }
    }

    @action remove(event) {
        event.stopPropagation();

        if (typeof this.args.remove === 'function') {
            this.args.remove(this.channel);
        }
    }
}
