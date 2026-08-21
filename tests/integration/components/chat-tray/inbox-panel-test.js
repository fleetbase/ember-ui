import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const PANEL = '.chat-inbox-panel';
const SEARCH = `${PANEL} input[type="search"]`;
const CLOSE = '.chat-inbox-icon-button';

function channel(id, title) {
    return { id, title, participants: [], last_message: { content: 'hello', createdAgo: 'just now' } };
}

module('Integration | Component | chat-tray/inbox-panel', function (hooks) {
    setupRenderingTest(hooks);

    let events;

    hooks.beforeEach(function () {
        events = [];
        this.set('channels', [channel('chan_1', 'Dispatch'), channel('chan_2', 'Support')]);
        this.set('close', () => events.push('close'));
        this.set('startChat', () => events.push('start'));
        this.set('setSearchQuery', (event) => events.push(['search', event.target.value]));
    });

    const TEMPLATE = hbs`
        <ChatTray::InboxPanel
            @channels={{this.channels}}
            @unreadCount={{this.unreadCount}}
            @searchQuery={{this.searchQuery}}
            @isLoading={{this.isLoading}}
            @close={{this.close}}
            @startChat={{this.startChat}}
            @setSearchQuery={{this.setSearchQuery}}
        />
    `;

    test('it lists a row per conversation', async function (assert) {
        await render(TEMPLATE);

        assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 2);
        assert.dom(PANEL).includesText('Dispatch');
        assert.dom(PANEL).includesText('Support');
    });

    test('it pluralises the unread count in the header', async function (assert) {
        this.set('unreadCount', 1);
        await render(TEMPLATE);
        assert.dom('.chat-inbox-panel-title').includesText('1 unread conversation');

        this.set('unreadCount', 3);
        await render(TEMPLATE);
        assert.dom('.chat-inbox-panel-title').includesText('3 unread conversations');
    });

    test('an empty inbox explains itself and offers a way out', async function (assert) {
        this.set('channels', []);

        await render(TEMPLATE);

        assert.dom('.chat-inbox-empty-state').includesText('No conversations found');
        assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 0);

        await click(findAll(`${PANEL} button`).find((button) => button.textContent.includes('New Chat')));

        assert.deepEqual(events, ['start'], 'the empty state can start a chat too');
    });

    test('no channels argument at all is treated as an empty inbox', async function (assert) {
        this.set('channels', undefined);

        await render(TEMPLATE);

        assert.dom('.chat-inbox-empty-state').exists();
    });

    test('a loading inbox shows a spinner instead of rows or an empty state', async function (assert) {
        this.set('isLoading', true);

        await render(TEMPLATE);

        assert.dom('.chat-inbox-empty-state').exists('the spinner shares the empty-state shell');
        assert.dom(PANEL).doesNotIncludeText('No conversations found');
        assert.strictEqual(findAll('.chat-inbox-conversation-row').length, 0);
    });

    test('the header controls report through their handlers', async function (assert) {
        await render(TEMPLATE);

        await click(CLOSE);
        await click(findAll('.chat-inbox-panel-actions button').find((button) => button.textContent.includes('New Chat')));
        await fillIn(SEARCH, 'dispatch');

        assert.deepEqual(events, ['close', 'start', ['search', 'dispatch']]);
    });

    // DEFECT (see DEFECTS.md #133): the close button and the search box bound their arguments
    // straight into `{{on}}`, so the panel could not render without them.
    test('it renders and stays inert with no handler arguments at all', async function (assert) {
        await render(hbs`<ChatTray::InboxPanel @channels={{this.channels}} />`);

        assert.dom(PANEL).exists('the panel renders');

        await click(CLOSE);
        await fillIn(SEARCH, 'dispatch');

        assert.ok(find(PANEL), 'and both controls are harmless no-ops');
    });
});
