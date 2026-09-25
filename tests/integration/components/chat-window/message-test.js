import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function createMessage(overrides = {}) {
    return {
        id: 'message-1',
        chat_channel_uuid: 'channel-1',
        sender_uuid: 'participant-2',
        sender: { name: 'Alex Driver', avatar_url: null },
        content: 'Arrived at the loading dock',
        createdAgo: '5 minutes ago',
        attachments: [],
        receipts: [],
        doesntHaveReadReceipt: () => false,
        ...overrides,
    };
}

module('Integration | Component | chat-window/message', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.chatParticipant = { id: 'participant-1', user_uuid: 'test-user-1', name: 'Test User' };

        // Replace IntersectionObserver with a deterministic fake that reports the
        // observed element as immediately fully visible.
        this._originalIntersectionObserver = window.IntersectionObserver;
        window.IntersectionObserver = class {
            constructor(callback) {
                this.callback = callback;
            }
            observe(element) {
                this.callback([{ target: element, isIntersecting: true }]);
            }
            disconnect() {}
        };
    });

    hooks.afterEach(function () {
        window.IntersectionObserver = this._originalIntersectionObserver;
    });

    test('it renders the sender, content, timestamp, and read receipts', async function (assert) {
        this.set('record', createMessage({ receipts: [{ participant_name: 'Test User', readAt: 'a minute ago' }] }));

        await render(hbs`<ChatWindow::Message @record={{this.record}} @chatParticipant={{this.chatParticipant}} />`);

        assert.dom('.chat-message-container').exists();
        assert.dom('.chat-message-container').doesNotHaveClass('has-attachments', 'no attachments class without attachments');
        assert.dom('.chat-message-sender-name').hasText('Alex Driver');
        assert.dom('.chat-message-content-bubble').hasText('Arrived at the loading dock');
        assert.dom('.chat-message-created-at').hasText('5 minutes ago');
        assert.dom('.chat-message-receipt').containsText('Test User', 'read receipts list the reader');
    });

    test('it renders attachments when the message has them', async function (assert) {
        this.set(
            'record',
            createMessage({
                attachments: [
                    {
                        filename: 'delivery-photo.png',
                        url: '/images/delivery-photo.png',
                        isImage: true,
                        download: () => {},
                    },
                ],
            })
        );

        await render(hbs`<ChatWindow::Message @record={{this.record}} @chatParticipant={{this.chatParticipant}} />`);

        assert.dom('.chat-message-container').hasClass('has-attachments');
        assert.dom('.chat-message-attachments-container .chat-attachment-container').exists({ count: 1 });
        assert.dom('.chat-attachment-image-preview').hasAttribute('alt', 'delivery-photo.png');
    });

    test('it creates a read receipt when an unread message becomes visible', async function (assert) {
        let checkedParticipant = null;
        this.set(
            'record',
            createMessage({
                doesntHaveReadReceipt: (participant) => {
                    checkedParticipant = participant;
                    return true;
                },
            })
        );

        await render(hbs`<ChatWindow::Message @record={{this.record}} @chatParticipant={{this.chatParticipant}} />`);

        assert.strictEqual(checkedParticipant, this.chatParticipant, 'existing receipts are checked for the viewing participant');
        const createCall = this.store.calls.find((call) => call.method === 'createRecord');
        assert.ok(createCall, 'a chat-receipt record is created');
        assert.strictEqual(createCall.args[0], 'chat-receipt');
        assert.deepEqual(createCall.args[1], { participant_uuid: 'participant-1', chat_message_uuid: 'message-1' }, 'receipt links the participant and message');
    });

    test('it does not create a read receipt for the viewer own message', async function (assert) {
        this.set(
            'record',
            createMessage({
                sender_uuid: 'participant-1',
                doesntHaveReadReceipt: () => true,
            })
        );

        await render(hbs`<ChatWindow::Message @record={{this.record}} @chatParticipant={{this.chatParticipant}} />`);

        assert.false(
            this.store.calls.some((call) => call.method === 'createRecord'),
            'no receipt is created when the viewer is the sender'
        );
    });
});
