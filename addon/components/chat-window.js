import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { all } from 'rsvp';

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
    @tracked pendingAttachmentFile;
    @tracked pendingAttachmentFiles = [];
    acceptedFileTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/pdf',
        'application/x-pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-flv',
        'video/x-ms-wmv',
        'audio/mpeg',
        'video/x-msvideo',
        'application/zip',
        'application/x-tar',
    ];

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
                    this.chat.insertMessageFromSocket(this.channel, socketEvent.data);
                    break;
            }
        });
    }

    @action onFileAddedHandler(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // set file for progress state
        this.pendingAttachmentFile = file;

        // Queue and upload immediatley
        this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/chat/${this.channel.id}/attachments`,
                type: 'chat_attachment',
                subject_uuid: this.channel.id,
                subject_type: 'chat_channel',
            },
            (uploadedFile) => {
                this.pendingAttachmentFiles.pushObject(uploadedFile);
                this.pendingAttachmentFile = undefined;
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.pendingAttachmentFile = undefined;
            }
        );
    }

    @action removePendingAttachmentFile(pendingFile) {
        this.pendingAttachmentFiles.removeObject(pendingFile);
    }

    @action sendMessage() {
        this.chat.sendMessage(this.channel, this.sender, this.pendingMessageContent).then((chatMessageRecord) => {
            this.sendAttachments(chatMessageRecord);
        });
        this.pendingMessageContent = '';
    }

    @action sendAttachments(chatMessageRecord) {
        // create file attachments
        const attachments = this.pendingAttachmentFiles.map((file) => {
            const attachment = this.store.createRecord('chat-attachment', {
                chat_channel_uuid: this.channel.id,
                file_uuid: file.id,
                sender_uuid: this.sender.id,
            });

            if (chatMessageRecord) {
                attachment.set('chat_message_uuid', chatMessageRecord.id);
            }

            return attachment;
        });

        // clear pending attachments
        this.pendingAttachmentFiles = [];

        // save attachments
        return all(attachments.map((_) => _.save())).then((response) => {
            console.log(response);
        });
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
