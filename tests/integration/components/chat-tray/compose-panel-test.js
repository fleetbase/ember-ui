import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const PANEL = '.chat-compose-panel';
const NAME_INPUT = '#chat-compose-name';
const SEARCH_INPUT = '#chat-compose-search';
const CLOSE = '.chat-inbox-icon-button';

function user(id, name) {
    return { id, name, email: `${id}@example.test` };
}

function buttonWithText(text) {
    return findAll(`${PANEL} button`).find((button) => button.textContent.includes(text));
}

module('Integration | Component | chat-tray/compose-panel', function (hooks) {
    setupRenderingTest(hooks);

    let events;

    hooks.beforeEach(function () {
        events = [];
        this.set('users', [user('ada', 'Ada Lovelace'), user('grace', 'Grace Hopper')]);
        this.set('close', () => events.push('close'));
        this.set('create', () => events.push('create'));
        this.set('toggleUser', (value) => events.push(['toggle', value.id]));
        this.set('removeSelectedUser', (value) => events.push(['remove', value.id]));
        this.set('setChannelName', (event) => events.push(['name', event.target.value]));
        this.set('setSearchQuery', (event) => events.push(['search', event.target.value]));
    });

    const TEMPLATE = hbs`
        <ChatTray::ComposePanel
            @users={{this.users}}
            @selectedUsers={{this.selectedUsers}}
            @channelName={{this.channelName}}
            @searchQuery={{this.searchQuery}}
            @isLoading={{this.isLoading}}
            @isSaving={{this.isSaving}}
            @canCreate={{this.canCreate}}
            @close={{this.close}}
            @create={{this.create}}
            @toggleUser={{this.toggleUser}}
            @removeSelectedUser={{this.removeSelectedUser}}
            @setChannelName={{this.setChannelName}}
            @setSearchQuery={{this.setSearchQuery}}
        />
    `;

    test('it lists a contact row per user', async function (assert) {
        await render(TEMPLATE);

        assert.strictEqual(findAll('.chat-compose-contact-row').length, 2);
        assert.dom(PANEL).includesText('Ada Lovelace');
        assert.dom(PANEL).includesText('Grace Hopper');
    });

    test('no contacts at all explains itself', async function (assert) {
        this.set('users', []);

        await render(TEMPLATE);

        assert.dom('.chat-inbox-empty-state').includesText('No contacts found');
        assert.strictEqual(findAll('.chat-compose-contact-row').length, 0);
    });

    test('no users argument at all is treated as none', async function (assert) {
        this.set('users', undefined);

        await render(TEMPLATE);

        assert.dom('.chat-inbox-empty-state').includesText('No contacts found');
    });

    test('a loading panel shows a spinner instead of contacts', async function (assert) {
        this.set('isLoading', true);

        await render(TEMPLATE);

        assert.strictEqual(findAll('.chat-compose-contact-row').length, 0);
        assert.dom(PANEL).doesNotIncludeText('No contacts found');
    });

    test('selected teammates are shown as removable chips', async function (assert) {
        this.set('selectedUsers', [user('ada', 'Ada Lovelace')]);

        await render(TEMPLATE);

        assert.strictEqual(findAll('.chat-compose-selected-user').length, 1);
        assert.dom('.chat-compose-selected-user').includesText('Ada Lovelace');

        await click('.chat-compose-selected-user button');

        assert.deepEqual(events, [['remove', 'ada']], 'the chip reports which teammate to drop');
    });

    test('no selection renders no chip row', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.chat-compose-selected-users').doesNotExist();
    });

    test('the create button is disabled until the panel says it can create', async function (assert) {
        await render(TEMPLATE);
        assert.dom(buttonWithText('Create Chat')).isDisabled();

        this.set('canCreate', true);
        await render(TEMPLATE);

        assert.dom(buttonWithText('Create Chat')).isNotDisabled();

        await click(buttonWithText('Create Chat'));
        assert.deepEqual(events, ['create']);
    });

    test('every control reports through its handler', async function (assert) {
        await render(TEMPLATE);

        await fillIn(NAME_INPUT, 'Dispatch room');
        await fillIn(SEARCH_INPUT, 'ada');
        await click('.chat-compose-contact-row');
        await click(CLOSE);

        assert.deepEqual(events, [['name', 'Dispatch room'], ['search', 'ada'], ['toggle', 'ada'], 'close']);
    });

    test('the footer cancel button closes too', async function (assert) {
        await render(TEMPLATE);
        await click(buttonWithText('Cancel'));

        assert.deepEqual(events, ['close']);
    });

    // DEFECT: four bindings went straight into `{{on}}`/`{{fn}}`, so the
    // panel could not render unless every one of them was supplied.
    test('it renders and stays inert with no handler arguments at all', async function (assert) {
        this.set('selectedUsers', [user('ada', 'Ada Lovelace')]);

        await render(hbs`<ChatTray::ComposePanel @users={{this.users}} @selectedUsers={{this.selectedUsers}} />`);

        assert.dom(PANEL).exists('the panel renders');

        await click(CLOSE);
        await fillIn(NAME_INPUT, 'Dispatch room');
        await fillIn(SEARCH_INPUT, 'ada');
        await click('.chat-compose-selected-user button');

        assert.ok(find(PANEL), 'and every control is a harmless no-op');
    });
});
