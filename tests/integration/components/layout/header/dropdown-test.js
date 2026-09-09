import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

const TRIGGER = '.next-header-menu-item-dd-trigger';

function menuItems() {
    return findAll('.next-header-menu-item-dd-content .next-dd-item');
}

module('Integration | Component | layout/header/dropdown', function (hooks) {
    setupRenderingTest(hooks);

    let dispatched;

    hooks.beforeEach(function () {
        dispatched = [];
        this.set('items', [
            { text: 'Settings', href: 'javascript:;', action: 'openSettings', params: ['general'], icon: 'gear' },
            { seperator: true },
            { text: 'Sign out', href: 'javascript:;', action: 'signOut' },
        ]);
        this.set('onAction', (...args) => dispatched.push(args));
    });

    const TEMPLATE = hbs`
        <Layout::Header::Dropdown @items={{this.items}} @onAction={{this.onAction}}>
            <span class="trigger-label">Account</span>
        </Layout::Header::Dropdown>
    `;

    test('it renders a trigger from its block', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.next-header-menu-item-dd').exists();
        assert.dom(`${TRIGGER} .trigger-label`).hasText('Account');
        assert.dom('.next-header-menu-item-dd-content').doesNotExist('the menu is closed to begin with');
    });

    test('opening it lists every item', async function (assert) {
        await render(TEMPLATE);
        await click(TRIGGER);

        assert.deepEqual(
            menuItems().map((item) => item.textContent.trim()),
            ['Settings', 'Sign out']
        );
        assert.dom('.next-dd-menu-seperator').exists('the separator is rendered');
        assert.dom('.next-dd-menu').hasClass('is-open');
    });

    test('an item icon is rendered', async function (assert) {
        await render(TEMPLATE);
        await click(TRIGGER);

        assert.dom(`${menuItems()[0].tagName.toLowerCase()}.next-dd-item svg`).hasClass('fa-gear');
    });

    test('choosing an item dispatches its action with its params and closes the menu', async function (assert) {
        await render(TEMPLATE);
        await click(TRIGGER);
        await click(menuItems()[0]);

        assert.strictEqual(dispatched.length, 1);
        assert.strictEqual(dispatched[0][0], 'openSettings');
        assert.deepEqual(dispatched[0][1], ['general']);
        assert.ok(dispatched[0][2] instanceof Event, 'the click event trails the declared params');
        assert.dom('.next-header-menu-item-dd-content').doesNotExist('the menu closed itself');
    });

    test('a named handler argument is called too', async function (assert) {
        const signOuts = [];
        this.set('signOut', (...args) => signOuts.push(args));

        await render(hbs`
            <Layout::Header::Dropdown @items={{this.items}} @onAction={{this.onAction}} @signOut={{this.signOut}}>
                <span class="trigger-label">Account</span>
            </Layout::Header::Dropdown>
        `);
        await click(TRIGGER);
        await click(menuItems()[1]);

        assert.strictEqual(dispatched.length, 1, 'the generic handler still fires');
        assert.strictEqual(dispatched[0][0], 'signOut');
        assert.strictEqual(dispatched[0][1], undefined, 'an item with no params passes none');
        assert.strictEqual(signOuts.length, 1, 'and so does the action-named handler');
    });

    test('it dispatches happily with no handlers at all', async function (assert) {
        await render(hbs`<Layout::Header::Dropdown @items={{this.items}}><span class="trigger-label">Account</span></Layout::Header::Dropdown>`);
        await click(TRIGGER);
        await click(menuItems()[0]);

        assert.dom('.next-header-menu-item-dd').exists('no handler is required');
    });

    test('an empty item list renders an empty menu', async function (assert) {
        this.set('items', []);

        await render(TEMPLATE);
        await click(TRIGGER);

        assert.deepEqual(menuItems(), []);
        assert.dom('.next-dd-menu').exists();
    });

    test('open and close handlers are forwarded to the dropdown', async function (assert) {
        const events = [];
        this.set('onOpen', () => events.push('open'));
        this.set('onClose', () => events.push('close'));

        await render(hbs`
            <Layout::Header::Dropdown @items={{this.items}} @onOpen={{this.onOpen}} @onClose={{this.onClose}}>
                <span class="trigger-label">Account</span>
            </Layout::Header::Dropdown>
        `);
        await click(TRIGGER);
        await click(TRIGGER);

        assert.deepEqual(events, ['open', 'close']);
    });

    test('it can start opened', async function (assert) {
        await render(hbs`
            <Layout::Header::Dropdown @items={{this.items}} @initiallyOpened={{true}}>
                <span class="trigger-label">Account</span>
            </Layout::Header::Dropdown>
        `);

        assert.strictEqual(menuItems().length, 2, 'the menu is already open');
    });

    test('class hooks and splattributes are applied', async function (assert) {
        await render(hbs`
            <Layout::Header::Dropdown @items={{this.items}} @triggerClass="my-trigger" @contentClass="my-content" @dropdownMenuClass="my-menu" data-test-dropdown="yes">
                <span class="trigger-label">Account</span>
            </Layout::Header::Dropdown>
        `);
        await click(TRIGGER);

        assert.dom('.next-header-menu-item-dd').hasAttribute('data-test-dropdown', 'yes');
        assert.dom(TRIGGER).hasClass('my-trigger');
        assert.dom('.next-header-menu-item-dd-content').hasClass('my-content');
        assert.dom('.next-dd-menu').hasClass('my-menu');
    });

    test('on a desktop it renders in place and is not marked as mobile', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.next-header-menu-item-dd').doesNotHaveClass('is-mobile');
        assert.dom(TRIGGER).doesNotHaveClass('is-mobile');
    });

    module('on mobile', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:media');
            this.owner.register('service:media', MobileMediaStub);
        });

        test('the wrapper and trigger are marked as mobile', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.next-header-menu-item-dd').hasClass('is-mobile');
            assert.dom(TRIGGER).hasClass('is-mobile');
        });

        test('the menu spans the full width below the trigger', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            const content = find('.ember-basic-dropdown-content');
            assert.strictEqual(content.style.left, '0px');
            assert.strictEqual(content.style.width, '100%');
            assert.strictEqual(content.style.padding, '0px 0.5rem');
            assert.notStrictEqual(content.style.top, '', 'the sheet is positioned below the trigger');
        });
    });
});
