import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ROW = '.chat-inbox-conversation-row';
const MAIN = '.chat-inbox-conversation-main';
const TITLE = '.chat-inbox-conversation-title';
const PREVIEW = '.chat-inbox-conversation-preview-text';
const END_CHAT = '.chat-inbox-row-action';

function participant(name) {
    return { id: `user_${name}`, name, avatar_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' };
}

function channel(overrides = {}) {
    return {
        id: 'chan_1',
        title: 'Dispatch room',
        participants: [participant('Ada')],
        last_message: { content: 'On my way', sender: { name: 'Ada' }, createdAgo: '2 minutes ago' },
        ...overrides,
    };
}

module('Integration | Component | chat-tray/conversation-row', function (hooks) {
    setupRenderingTest(hooks);

    let opened;
    let removed;

    hooks.beforeEach(function () {
        opened = [];
        removed = [];
        this.set('channel', channel());
        this.set('open', (value) => opened.push(value));
        this.set('remove', (value) => removed.push(value));
    });

    const TEMPLATE = hbs`
        <ChatTray::ConversationRow @channel={{this.channel}} @isOpen={{this.isOpen}} @open={{this.open}} @remove={{this.remove}} />
    `;

    module('naming the conversation', function () {
        test('it prefers the channel title', async function (assert) {
            await render(TEMPLATE);

            assert.dom(TITLE).hasText('Dispatch room');
        });

        test('it falls back to the channel name', async function (assert) {
            this.set('channel', channel({ title: null, name: 'Fallback name' }));

            await render(TEMPLATE);

            assert.dom(TITLE).hasText('Fallback name');
        });

        test('a channel with neither is called Untitled Chat', async function (assert) {
            this.set('channel', channel({ title: null, name: null }));

            await render(TEMPLATE);

            assert.dom(TITLE).hasText('Untitled Chat');
        });

        test('no channel at all still renders a row', async function (assert) {
            await render(hbs`<ChatTray::ConversationRow />`);

            assert.dom(ROW).exists('a missing channel is not a crash');
            assert.dom(TITLE).hasText('Untitled Chat');
        });
    });

    module('the message preview', function () {
        test('the last message content is previewed with its sender', async function (assert) {
            await render(TEMPLATE);

            assert.dom(PREVIEW).hasText('On my way');
            assert.dom('.chat-inbox-conversation-sender').hasText('Ada:');
        });

        test('a channel with no messages says so', async function (assert) {
            this.set('channel', channel({ last_message: null }));

            await render(TEMPLATE);

            assert.dom(PREVIEW).hasText('No messages yet');
            assert.dom('.chat-inbox-conversation-sender').doesNotExist('with nobody to attribute it to');
        });

        test('a single attachment with no text is counted in the singular', async function (assert) {
            this.set('channel', channel({ last_message: { attachments: [{ id: 'a1' }], sender: { name: 'Ada' } } }));

            await render(TEMPLATE);

            assert.dom(PREVIEW).hasText('1 attachment');
            assert.dom('.chat-inbox-conversation-pill').includesText('Attachment', 'and the row is pilled as having one');
        });

        test('several attachments are counted in the plural', async function (assert) {
            this.set('channel', channel({ last_message: { attachments: [{ id: 'a1' }, { id: 'a2' }] } }));

            await render(TEMPLATE);

            assert.dom(PREVIEW).hasText('2 attachments');
        });

        test('a message with neither text nor attachments is described generically', async function (assert) {
            this.set('channel', channel({ last_message: { sender: { name: 'Ada' } } }));

            await render(TEMPLATE);

            assert.dom(PREVIEW).hasText('Sent a message');
        });
    });

    module('the timestamp', function () {
        test('the last message time wins', async function (assert) {
            this.set('channel', channel({ updatedAgo: 'an hour ago' }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-conversation-time').hasText('2 minutes ago');
        });

        test('it falls back to the channel update time', async function (assert) {
            this.set('channel', channel({ last_message: null, updatedAgo: 'an hour ago', createdAgo: 'last week' }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-conversation-time').hasText('an hour ago');
        });

        test('and then to the channel creation time', async function (assert) {
            this.set('channel', channel({ last_message: null, createdAgo: 'last week' }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-conversation-time').hasText('last week');
        });

        test('a channel with no times at all shows none', async function (assert) {
            this.set('channel', channel({ last_message: null }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-conversation-time').doesNotExist();
        });
    });

    module('participants', function () {
        test('up to three avatars are shown', async function (assert) {
            this.set('channel', channel({ participants: [participant('Ada'), participant('Grace'), participant('Alan')] }));

            await render(TEMPLATE);

            assert.dom(`${ROW} .chat-inbox-conversation-avatar`).exists();
            assert.strictEqual(this.element.querySelectorAll('img.chat-inbox-conversation-avatar').length, 3);
            assert.dom('.chat-inbox-conversation-avatar-count').doesNotExist('nothing is left over');
        });

        test('a fourth participant becomes a +1 counter', async function (assert) {
            this.set('channel', channel({ participants: [participant('Ada'), participant('Grace'), participant('Alan'), participant('Edsger')] }));

            await render(TEMPLATE);

            assert.strictEqual(this.element.querySelectorAll('img.chat-inbox-conversation-avatar').length, 3, 'still only three faces');
            assert.dom('.chat-inbox-conversation-avatar-count').hasText('+1');
        });

        test('a channel with nobody in it shows a placeholder', async function (assert) {
            this.set('channel', channel({ participants: [] }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-conversation-avatar-empty').exists();
        });
    });

    module('unread and open state', function () {
        test('an unread count is badged and marks the row', async function (assert) {
            this.set('channel', channel({ unread_count: 4 }));

            await render(TEMPLATE);

            assert.dom('.chat-inbox-unread-badge').hasText('4');
            assert.dom(ROW).hasClass('has-unread');
        });

        test('a read conversation carries neither', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.chat-inbox-unread-badge').doesNotExist();
            assert.dom(ROW).doesNotHaveClass('has-unread');
        });

        test('the open conversation is marked', async function (assert) {
            this.set('isOpen', true);

            await render(TEMPLATE);

            assert.dom(ROW).hasClass('is-open');
        });

        test('anything other than true is not open', async function (assert) {
            this.set('isOpen', 'yes');

            await render(TEMPLATE);

            assert.dom(ROW).doesNotHaveClass('is-open', 'the check is strict');
        });
    });

    module('acting on the row', function () {
        test('clicking the row opens the channel', async function (assert) {
            await render(TEMPLATE);
            await click(MAIN);

            assert.deepEqual(opened, [this.channel]);
        });

        test('clicking without an open handler is inert', async function (assert) {
            await render(hbs`<ChatTray::ConversationRow @channel={{this.channel}} />`);
            await click(MAIN);

            assert.ok(find(ROW), 'the row survives');
        });

        // The end-chat button only belongs to whoever started the conversation.
        test('the creator is offered an end-chat button', async function (assert) {
            const currentUser = this.owner.lookup('service:current-user');
            this.set('channel', channel({ created_by_uuid: currentUser.id }));

            await render(TEMPLATE);

            assert.dom(END_CHAT).exists();

            await click(END_CHAT);

            assert.deepEqual(removed, [this.channel], 'and it reports the channel');
            assert.deepEqual(opened, [], 'without also opening it');
        });

        test('everyone else is not', async function (assert) {
            this.set('channel', channel({ created_by_uuid: 'somebody-else' }));

            await render(TEMPLATE);

            assert.dom(END_CHAT).doesNotExist();
        });

        test('ending a chat without a remove handler is inert', async function (assert) {
            const currentUser = this.owner.lookup('service:current-user');
            this.set('channel', channel({ created_by_uuid: currentUser.id }));

            await render(hbs`<ChatTray::ConversationRow @channel={{this.channel}} />`);
            await click(END_CHAT);

            assert.ok(find(ROW), 'the row survives');
        });
    });
});
