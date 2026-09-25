import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ChatWindowMessageComponent extends Component {
    @service store;
    @tracked chatMessage;
    @tracked chatParticipant;
    @tracked channelFeedContainerElement;
    @tracked observer;

    constructor(owner, { record, chatParticipant, channelFeedContainerElement }) {
        super(...arguments);
        this.chatMessage = record;
        this.chatParticipant = chatParticipant;
        this.channelFeedContainerElement = channelFeedContainerElement;
    }

    willDestroy() {
        /* istanbul ignore else -- trackVisibility runs from {{did-insert}}, so the observer
           exists for the whole life of a rendered message */
        if (this.observer) {
            this.observer.disconnect();
        }
        super.willDestroy();
    }

    @task *createReadReceipt() {
        // if the chat participant is the message sender no read receipt is required
        if (this.chatParticipant && this.chatMessage.sender_uuid === this.chatParticipant.id) {
            return;
        }

        if (this.chatMessage.doesntHaveReadReceipt(this.chatParticipant)) {
            const newReadReceipt = this.store.createRecord('chat-receipt', {
                participant_uuid: this.chatParticipant.id,
                chat_message_uuid: this.chatMessage.id,
            });

            yield newReadReceipt.save();
        }
    }

    @action trackVisibility(chatMessageElement) {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    /* istanbul ignore else -- the observer is created with a threshold that only
                       reports an entry once it is intersecting */
                    if (entry.isIntersecting) {
                        this.createReadReceipt.perform();
                    }
                });
            },
            {
                root: this.getChannelFeedContainerElement(),
                rootMargin: '0px',
                threshold: 1.0,
            }
        );

        this.observer.observe(chatMessageElement);
    }

    getChannelFeedContainerElement() {
        /* istanbul ignore if -- the element is registered by {{did-insert}} on the feed
           container, which wraps every message, so it is always set by the time a message asks */
        if (this.channelFeedContainerElement) {
            return this.channelFeedContainerElement;
        }
        return document.getElementById(`channel-${this.chatMessage.chat_channel_uuid}-feed`);
    }
}
