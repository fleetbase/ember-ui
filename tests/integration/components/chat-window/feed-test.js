import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const FEED = '.chat-window-messages';

module('Integration | Component | chat-window/feed', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // `log` entries are the simplest feed type — they read only resolved_content and
        // createdAgo, with none of the read-receipt machinery `message` needs.
        this.set('channel', {
            feed: [
                { type: 'log', record: { id: 'log_1', resolved_content: 'Alex joined the channel', createdAgo: '5 minutes ago' } },
                { type: 'log', record: { id: 'log_2', resolved_content: 'Sam joined the channel', createdAgo: '2 minutes ago' } },
            ],
        });
        this.set('chatParticipant', { id: 'participant_1', name: 'Alex' });
    });

    test('it renders one component per feed entry', async function (assert) {
        await render(hbs`<ChatWindow::Feed @channel={{this.channel}} @chatParticipant={{this.chatParticipant}} />`);

        assert.dom(FEED).exists();
        assert.dom(FEED).containsText('Alex joined the channel');
        assert.dom(FEED).containsText('Sam joined the channel');
        assert.dom(FEED).containsText('5 minutes ago');
    });

    test('an empty feed renders an empty container', async function (assert) {
        this.set('channel', { feed: [] });

        await render(hbs`<ChatWindow::Feed @channel={{this.channel}} />`);

        assert.dom(FEED).exists();
        assert.dom(FEED).hasText('');
    });

    test('no channel at all renders an empty container', async function (assert) {
        await render(hbs`<ChatWindow::Feed />`);

        assert.dom(FEED).exists();
        assert.dom(FEED).hasText('');
    });

    test('a block replaces the default rendering and receives the feed', async function (assert) {
        await render(hbs`
            <ChatWindow::Feed @channel={{this.channel}} as |feed|>
                {{#each feed as |item|}}
                    <p class="custom">{{item.record.resolved_content}}</p>
                {{/each}}
            </ChatWindow::Feed>
        `);

        assert.deepEqual(
            findAll(`${FEED} p.custom`).map((node) => node.textContent.trim()),
            ['Alex joined the channel', 'Sam joined the channel']
        );
    });

    test('the feed container element is handed to each entry', async function (assert) {
        await render(hbs`
            <div class="outer">
                <ChatWindow::Feed @channel={{this.channel}} @chatParticipant={{this.chatParticipant}} />
            </div>
        `);

        // setChannelFeedElements resolves the container as the feed element's parent, which is
        // what the message components scroll. Rendering at all proves it was resolved.
        assert.dom('.outer > .chat-window-messages').exists();
        assert.dom(FEED).containsText('Alex joined the channel');
    });
});
