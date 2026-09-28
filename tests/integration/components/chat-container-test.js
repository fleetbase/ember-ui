import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function createChannel(id, name) {
    return {
        id,
        public_id: `chat_channel_${id}`,
        name,
        created_by_uuid: `participant-self-${id}`,
        participants: [
            {
                id: `participant-self-${id}`,
                user_uuid: 'test-user-1',
                name: 'Test User',
                avatar_url: null,
            },
        ],
        feed: [],
        reloadParticipants: () => {},
    };
}

module('Integration | Component | chat-container', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.chat = this.owner.lookup('service:chat');
    });

    test('it restores previously opened chats on initialization', async function (assert) {
        await render(hbs`<ChatContainer />`);

        assert.dom('.chat-container').exists();
        assert.true(
            this.chat.calls.some((call) => call.method === 'restoreOpenedChats'),
            'restoreOpenedChats is called on the chat service'
        );
        assert.dom('.chat-window-container').doesNotExist('no chat windows are rendered when there are no open channels');
    });

    test('it renders a chat window for each open channel', async function (assert) {
        this.chat.openChannel(createChannel('alpha', 'Dispatch Team'));
        this.chat.openChannel(createChannel('bravo', 'Drivers'));

        await render(hbs`<ChatContainer />`);

        assert.dom('.chat-window-container').exists({ count: 2 }, 'one chat window per open channel');
        assert.dom('#channel-alpha-window .chat-window-name').containsText('Dispatch Team');
        assert.dom('#channel-bravo-window .chat-window-name').containsText('Drivers');
    });

    test('it removes the chat window when its channel is closed', async function (assert) {
        const channel = createChannel('alpha', 'Dispatch Team');
        this.chat.openChannel(channel);

        await render(hbs`<ChatContainer />`);
        assert.dom('.chat-window-container').exists({ count: 1 });

        this.chat.closeChannel(channel);
        await settled();

        assert.dom('.chat-window-container').doesNotExist('chat window is removed once the channel closes');
    });
});
