import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, settled, triggerKeyEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectFiles } from 'ember-file-upload/test-support';

function createChannel(overrides = {}) {
    return {
        id: 'channel-1',
        public_id: 'chat_channel_1',
        name: 'Dispatch Team',
        created_by_uuid: 'participant-self',
        participants: [
            {
                id: 'participant-self',
                user_uuid: 'test-user-1',
                name: 'Test User',
                avatar_url: null,
            },
            {
                id: 'participant-2',
                user_uuid: 'user-2',
                name: 'Alex Driver',
                avatar_url: null,
            },
        ],
        feed: [],
        reloadParticipants: () => {},
        ...overrides,
    };
}

module('Integration | Component | chat-window', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.chat = this.owner.lookup('service:chat');
        this.socket = this.owner.lookup('service:socket');
        this.fetch = this.owner.lookup('service:fetch');
        this.channel = createChannel();
    });

    test('it renders the channel name, participants, and feed for a participating user', async function (assert) {
        this.channel.feed = [
            {
                type: 'message',
                record: {
                    id: 'message-1',
                    chat_channel_uuid: 'channel-1',
                    sender_uuid: 'participant-2',
                    sender: { name: 'Alex Driver', avatar_url: null },
                    content: 'Arrived at the loading dock',
                    createdAgo: '5 minutes ago',
                    attachments: [],
                    receipts: [{ participant_name: 'Test User', readAt: 'a minute ago' }],
                    doesntHaveReadReceipt: () => false,
                },
            },
            {
                type: 'log',
                record: {
                    id: 'log-1',
                    resolved_content: 'Alex Driver joined the chat',
                    createdAgo: '10 minutes ago',
                },
            },
        ];

        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        assert.dom('.chat-window-container').exists();
        assert.dom('.chat-window-name').containsText('Dispatch Team');
        assert.dom('.chat-window-participant-bubble-container').exists({ count: 2 }, 'renders a bubble for each participant');
        assert.dom('.chat-message-content-bubble').hasText('Arrived at the loading dock');
        assert.dom('.chat-message-sender-name').hasText('Alex Driver');
        assert.dom('.chat-message-receipts').containsText('Test User', 'renders read receipts');
        assert.dom('.chat-log-content-bubble').containsText('Alex Driver joined the chat');
        assert.true(
            this.socket.calls.some((call) => call.method === 'listen' && call.args[0] === 'chat.chat_channel_1'),
            'listens on the channel socket'
        );
    });

    test('it falls back to a default name when the channel is untitled', async function (assert) {
        this.channel.name = null;

        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        assert.dom('.chat-window-name').containsText('Untitled Chat');
    });

    test('it closes the channel when the current user is not a participant', async function (assert) {
        this.channel.participants = [
            {
                id: 'participant-2',
                user_uuid: 'user-2',
                name: 'Alex Driver',
                avatar_url: null,
            },
        ];

        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        assert.dom('.chat-window-container').doesNotExist('window is not shown for non-participants');
        const closeCall = this.chat.calls.find((call) => call.method === 'closeChannel');
        assert.ok(closeCall, 'closeChannel is called on the chat service');
        assert.strictEqual(closeCall.args[0], this.channel, 'closeChannel is called with the channel');
    });

    test('it closes the channel from the close button', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);
        await click('.chat-window-close-button');

        const closeCall = this.chat.calls.find((call) => call.method === 'closeChannel');
        assert.ok(closeCall, 'closeChannel is called on the chat service');
        assert.strictEqual(closeCall.args[0], this.channel, 'closeChannel is called with the channel');
    });

    test('it sends a typed message and clears the input', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        assert.dom('.chat-window-submit-container button').isDisabled('send button is disabled with no message content');

        await fillIn('.chat-window-input', 'Hello team');
        assert.dom('.chat-window-submit-container button').isNotDisabled('send button is enabled once content is typed');

        await click('.chat-window-submit-container button');

        const sendCall = this.chat.calls.find((call) => call.method === 'sendMessage');
        assert.ok(sendCall, 'sendMessage is called on the chat service');
        assert.strictEqual(sendCall.args[0], this.channel, 'message is sent to the channel');
        assert.strictEqual(sendCall.args[1].user_uuid, 'test-user-1', 'message is sent as the current user participant');
        assert.strictEqual(sendCall.args[2], 'Hello team', 'message content is sent');
        assert.deepEqual(sendCall.args[3], [], 'no attachments are sent');
        assert.dom('.chat-window-input').hasValue('', 'input is cleared after sending');
    });

    test('it sends the message when enter is pressed', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        await fillIn('.chat-window-input', 'Sent with enter');
        await triggerKeyEvent('.chat-window-input', 'keypress', 13);

        const sendCall = this.chat.calls.find((call) => call.method === 'sendMessage');
        assert.ok(sendCall, 'sendMessage is called on the chat service');
        assert.strictEqual(sendCall.args[2], 'Sent with enter', 'message content is sent');
        assert.dom('.chat-window-input').hasValue('', 'input is cleared after sending');
    });

    test('it uploads an attachment, lists it as pending, and removes it on request', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        await selectFiles('.chat-window-attachment-input input[type="file"]', new File(['delivery notes'], 'notes.txt', { type: 'text/plain' }));

        const uploadCall = this.fetch.calls.find((call) => call.method === 'uploadFile.perform');
        assert.ok(uploadCall, 'uploadFile is performed through the fetch service');
        assert.strictEqual(uploadCall.args[1].path, 'uploads/chat/channel-1/attachments', 'file is uploaded to the channel attachments path');
        assert.dom('.chat-window-pending-attachment').exists({ count: 1 }, 'uploaded file is listed as a pending attachment');
        assert.dom('.chat-window-container').hasClass('has-attachments');

        await click('.chat-window-pending-attachment-actions a');

        assert.dom('.chat-window-pending-attachment').doesNotExist('pending attachment is removed');
        assert.dom('.chat-window-container').doesNotHaveClass('has-attachments');
    });

    test('it includes uploaded attachments when sending a message', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        await selectFiles('.chat-window-attachment-input input[type="file"]', new File(['delivery notes'], 'notes.txt', { type: 'text/plain' }));
        await fillIn('.chat-window-input', 'See attached');
        await click('.chat-window-submit-container button');

        const sendCall = this.chat.calls.find((call) => call.method === 'sendMessage');
        assert.ok(sendCall, 'sendMessage is called on the chat service');
        assert.deepEqual(sendCall.args[3], ['test-file-1'], 'uploaded attachment ids are sent with the message');
        assert.dom('.chat-window-pending-attachment').doesNotExist('pending attachments are cleared after sending');
    });

    test('it forwards socket events to the chat service', async function (assert) {
        await render(hbs`<ChatWindow @channel={{this.channel}} />`);

        const listenCall = this.socket.calls.find((call) => call.method === 'listen' && call.args[0] === 'chat.chat_channel_1');
        assert.ok(listenCall, 'listens on the channel socket');

        const callback = listenCall.args[1];
        callback({ event: 'chat_message.created', data: { id: 'message-2' } });
        callback({ event: 'chat_log.created', data: { id: 'log-2' } });
        await settled();

        const insertMessageCall = this.chat.calls.find((call) => call.method === 'insertChatMessageFromSocket');
        assert.ok(insertMessageCall, 'chat_message.created is forwarded to insertChatMessageFromSocket');
        assert.strictEqual(insertMessageCall.args[0], this.channel, 'message is inserted into the channel');
        assert.deepEqual(insertMessageCall.args[1], { id: 'message-2' }, 'socket payload is forwarded');
        assert.true(
            this.chat.calls.some((call) => call.method === 'insertChatLogFromSocket'),
            'chat_log.created is forwarded to insertChatLogFromSocket'
        );
    });

    module('socket events', function () {
        function socketCallback(context) {
            const listenCall = context.socket.calls.find((call) => call.method === 'listen' && call.args[0] === 'chat.chat_channel_1');
            return listenCall.args[1];
        }

        function methodsCalled(context) {
            return context.chat.calls.map((call) => call.method);
        }

        test('an attachment event is forwarded to the chat service', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            socketCallback(this)({ event: 'chat_attachment.created', data: { id: 'attachment-1' } });
            await settled();

            const call = this.chat.calls.find((entry) => entry.method === 'insertChatAttachmentFromSocket');
            assert.ok(call, 'the attachment is inserted');
            assert.strictEqual(call.args[0], this.channel);
            assert.deepEqual(call.args[1], { id: 'attachment-1' });
        });

        test('a read receipt event is forwarded to the chat service', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            socketCallback(this)({ event: 'chat_receipt.created', data: { id: 'receipt-1' } });
            await settled();

            const call = this.chat.calls.find((entry) => entry.method === 'insertChatReceiptFromSocket');
            assert.ok(call, 'the receipt is inserted');
            assert.deepEqual(call.args[1], { id: 'receipt-1' });
        });

        test('every participant event reloads the participants', async function (assert) {
            let reloads = 0;
            this.channel.reloadParticipants = () => reloads++;

            await render(hbs`<ChatWindow @channel={{this.channel}} />`);
            const callback = socketCallback(this);

            for (const event of ['chat.added_participant', 'chat.removed_participant', 'chat_participant.created', 'chat_participant.deleted']) {
                callback({ event, data: {} });
            }
            await settled();

            assert.strictEqual(reloads, 4, 'each of the four participant events reloads the roster');
        });

        test('an unrecognised event is ignored', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);
            const before = methodsCalled(this).length;

            socketCallback(this)({ event: 'something.else', data: {} });
            await settled();

            assert.strictEqual(methodsCalled(this).length, before, 'nothing is forwarded to the chat service');
        });
    });

    module('participants', function () {
        test('adding a participant hands the user to the chat service', async function (assert) {
            this.store = this.owner.lookup('service:store');
            this.store.queryResults = { user: [{ id: 'user-9', name: 'New Person', user_uuid: 'user-9' }] };

            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            const trigger = this.element.querySelector('.chat-window-controls .ember-basic-dropdown-trigger');
            assert.ok(trigger, 'an add-participant dropdown is offered');

            await click(trigger);
            const option = Array.from(document.querySelectorAll('.next-dd-item')).find((item) => item.textContent.includes('New Person'));
            assert.ok(option, 'the available user is listed');

            await click(option);

            const call = this.chat.calls.find((entry) => entry.method === 'addParticipant');
            assert.ok(call, 'the chat service is asked to add them');
            assert.strictEqual(call.args[0], this.channel);
        });

        // The remove control is gated by the `can-remove-chat-participant` helper, so which
        // participants offer one depends on who the sender is. Select by the bubble's alt text
        // rather than by position.
        function removeButtonFor(context, name) {
            const bubble = Array.from(context.element.querySelectorAll('.chat-window-participant-bubble-container')).find((container) => container.querySelector(`[alt="${name}"]`) !== null);

            return bubble?.querySelector('.chat-window-remove-participant');
        }

        test('removing another participant asks for confirmation first', async function (assert) {
            // can-remove-chat-participant only allows removing someone else when the sender
            // created the channel, and it keys on user_uuid.
            this.channel = createChannel({ created_by_uuid: 'test-user-1' });

            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            const button = removeButtonFor(this, 'Alex Driver');
            assert.ok(button, 'the other participant offers a remove control');

            await click(button);

            const modalsManager = this.owner.lookup('service:modals-manager');
            const confirmation = modalsManager.modals.find((modal) => modal.options?.title);
            assert.ok(confirmation, 'a confirmation modal is opened');
            assert.true(/remove this participant \(Alex Driver\)/i.test(confirmation.options.title), confirmation.options.title);
            assert.deepEqual(
                this.chat.calls.filter((entry) => entry.method === 'removeParticipant'),
                [],
                'nothing is removed until the modal is confirmed'
            );
        });

        test('removing yourself is worded as leaving the chat', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            const button = removeButtonFor(this, 'Test User');
            assert.ok(button, 'you can remove yourself');

            await click(button);

            const modalsManager = this.owner.lookup('service:modals-manager');
            const confirmation = modalsManager.modals.find((modal) => modal.options?.title);
            assert.true(/leave this chat/i.test(confirmation.options.title), confirmation.options.title);
            assert.true(/not be able to access this chat/i.test(confirmation.options.body));

            // Only confirming reaches the `isRemovingSelf` close; asserting the copy stops short.
            await confirmation.options.confirm({ startLoading() {}, stopLoading() {}, done() {} });

            assert.ok(
                this.chat.calls.find((call) => call.method === 'closeChannel'),
                'leaving the chat closes the window'
            );
        });

        test('confirming the removal removes the participant', async function (assert) {
            this.channel = createChannel({ created_by_uuid: 'test-user-1' });

            await render(hbs`<ChatWindow @channel={{this.channel}} />`);
            await click(removeButtonFor(this, 'Alex Driver'));

            const modalsManager = this.owner.lookup('service:modals-manager');
            const confirmation = modalsManager.modals.find((modal) => modal.options?.confirm);
            await confirmation.options.confirm({ startLoading: () => {} });

            const call = this.chat.calls.find((entry) => entry.method === 'removeParticipant');
            assert.ok(call, 'the participant is removed');
            assert.strictEqual(call.args[0], this.channel);
        });
    });

    module('renaming the channel', function () {
        test('the title offers an edit control that opens a rename modal', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            const editLink = this.element.querySelector('.chat-window-name a');
            assert.ok(editLink, 'an edit control is rendered beside the name');

            await click(editLink);

            const modalsManager = this.owner.lookup('service:modals-manager');
            const modal = modalsManager.modals.find((entry) => entry.options?.channelName !== undefined);
            assert.ok(modal, 'the rename modal is opened');
            assert.strictEqual(modal.options.channelName, 'Dispatch Team', 'seeded with the current name');
            assert.strictEqual(modal.options.acceptButtonText, 'Save Changes');
        });

        test('confirming with a name updates the channel', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);
            await click(this.element.querySelector('.chat-window-name a'));

            const modalsManager = this.owner.lookup('service:modals-manager');
            const modal = modalsManager.modals.find((entry) => entry.options?.channelName !== undefined);

            await modal.options.confirm({
                startLoading: () => {},
                getOption: () => 'Renamed Team',
            });

            const call = this.chat.calls.find((entry) => entry.method === 'updateChatChannel');
            assert.ok(call, 'the channel is updated');
            assert.deepEqual(call.args[1], { name: 'Renamed Team' });
        });

        test('confirming with an empty name warns instead of saving', async function (assert) {
            const notifications = this.owner.lookup('service:notifications');
            notifications.calls = [];

            await render(hbs`<ChatWindow @channel={{this.channel}} />`);
            await click(this.element.querySelector('.chat-window-name a'));

            const modalsManager = this.owner.lookup('service:modals-manager');
            const modal = modalsManager.modals.find((entry) => entry.options?.channelName !== undefined);

            await modal.options.confirm({ startLoading: () => {}, getOption: () => '' });

            assert.deepEqual(
                this.chat.calls.filter((entry) => entry.method === 'updateChatChannel'),
                [],
                'nothing is saved'
            );
            assert.deepEqual(
                notifications.calls.filter((call) => call.method === 'warning').map((call) => call.args[0]),
                ['Name required to save changes.'],
                'the user is warned that a name is required'
            );
        });
    });
    // Paths the happy-path fixtures never take.
    module('less-travelled paths', function () {
        test('shift+enter inserts a newline instead of sending', async function (assert) {
            await render(hbs`<ChatWindow @channel={{this.channel}} />`);

            await fillIn('.chat-window-input', 'Line one');
            await triggerKeyEvent('.chat-window-input', 'keypress', 13, { shiftKey: true });

            assert.notOk(
                this.chat.calls.find((call) => call.method === 'sendMessage'),
                'nothing is sent'
            );
            assert.dom('.chat-window-input').hasValue('Line one', 'and the draft is kept');
        });

        test('a failure loading available users is reported and does not throw', async function (assert) {
            const warnings = [];
            const originalWarn = console.warn;
            console.warn = (...args) => warnings.push(args[0]);
            this.owner.lookup('service:store').query = () => Promise.reject(new Error('unavailable'));

            try {
                await render(hbs`<ChatWindow @channel={{this.channel}} />`);
                await click(this.element.querySelector('.chat-window-controls .ember-basic-dropdown-trigger'));
            } finally {
                console.warn = originalWarn;
            }

            assert.strictEqual(warnings[0], 'Error loading available users:', 'the failure is reported');
        });
    });
});
