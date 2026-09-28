import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ROW = '.chat-compose-contact-row';

function user(overrides = {}) {
    return { id: 'user_ada', name: 'Ada Lovelace', email: 'ada@example.test', ...overrides };
}

module('Integration | Component | chat-tray/contact-row', function (hooks) {
    setupRenderingTest(hooks);

    let toggled;

    hooks.beforeEach(function () {
        toggled = [];
        this.set('user', user());
        this.set('toggle', (value) => toggled.push(value));
    });

    const TEMPLATE = hbs`<ChatTray::ContactRow @user={{this.user}} @selectedUsers={{this.selectedUsers}} @toggle={{this.toggle}} />`;

    test('it renders the name and falls back through the contact details', async function (assert) {
        await render(TEMPLATE);
        assert.dom('.chat-compose-contact-name').hasText('Ada Lovelace');
        assert.dom('.chat-compose-contact-subtitle').hasText('ada@example.test', 'the email is preferred');

        this.set('user', user({ email: null, phone: '+1 555 0100' }));
        await render(TEMPLATE);
        assert.dom('.chat-compose-contact-subtitle').hasText('+1 555 0100', 'then the phone number');

        this.set('user', user({ email: null }));
        await render(TEMPLATE);
        assert.dom('.chat-compose-contact-subtitle').hasText('Fleetbase user', 'and then a generic label');
    });

    test('an online contact is marked as such', async function (assert) {
        this.set('user', user({ is_online: true }));

        await render(TEMPLATE);

        assert.dom('.chat-compose-contact-presence').hasClass('is-online');
    });

    test('an offline contact is not', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.chat-compose-contact-presence').doesNotHaveClass('is-online');
    });

    test('a contact in the selection is ticked', async function (assert) {
        this.set('selectedUsers', [user()]);

        await render(TEMPLATE);

        assert.dom(ROW).hasClass('is-selected');
        assert.dom(`${ROW} .fa-check`).exists('a tick rather than a plus');
        assert.dom(`${ROW} .fa-plus`).doesNotExist();
    });

    test('a contact not in the selection offers a plus', async function (assert) {
        this.set('selectedUsers', [user({ id: 'user_grace' })]);

        await render(TEMPLATE);

        assert.dom(ROW).doesNotHaveClass('is-selected');
        assert.dom(`${ROW} .fa-plus`).exists();
    });

    test('no selection at all is treated as an empty one', async function (assert) {
        await render(hbs`<ChatTray::ContactRow @user={{this.user}} />`);

        assert.dom(ROW).doesNotHaveClass('is-selected');
    });

    test('clicking the row reports the contact', async function (assert) {
        await render(TEMPLATE);
        await click(ROW);

        assert.deepEqual(toggled, [this.user]);
    });

    test('clicking without a toggle handler is inert', async function (assert) {
        await render(hbs`<ChatTray::ContactRow @user={{this.user}} />`);
        await click(ROW);

        assert.ok(find(ROW), 'the row survives a click it has nothing to do with');
    });
});
