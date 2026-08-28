import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

const TEMPLATE = hbs`<Layout::Header::Dropdown::Item @item={{this.item}} @onAction={{this.onAction}} />`;

function menuItem() {
    return find('.next-header-dd-menu-item');
}

module('Integration | Component | layout/header/dropdown/item', function (hooks) {
    setupRenderingTest(hooks);

    let actions;

    hooks.beforeEach(function () {
        actions = [];
        this.set('onAction', (...args) => actions.push(args));
    });

    module('text-only items', function () {
        test('an item with only text renders as plain text', async function (assert) {
            this.set('item', { text: 'Signed in as Ron' });

            await render(TEMPLATE);

            assert.dom(menuItem()).hasText('Signed in as Ron');
            assert.dom('a').doesNotExist('there is nothing to click');
        });

        test('an icon is rendered alongside the text', async function (assert) {
            this.set('item', { text: 'Account', icon: 'user' });

            await render(TEMPLATE);

            assert.dom('.next-header-dd-menu-item svg').exists();
        });

        test('an array of text lines renders one line each', async function (assert) {
            this.set('item', { text: ['Ron Richardson', 'ron@example.test'], class: 'line' });

            await render(TEMPLATE);

            const lines = findAll('.line').map((node) => node.textContent.trim());
            assert.deepEqual(lines, ['Ron Richardson', 'ron@example.test']);
        });

        test('an object line without a component renders its own text and class', async function (assert) {
            this.set('item', { text: [{ text: 'Owner', class: 'role-line' }] });

            await render(TEMPLATE);

            assert.dom('.role-line').hasText('Owner');
        });

        test('a custom wrapper class is appended, or replaces the default when asked', async function (assert) {
            this.set('item', { text: 'Account', wrapperClass: 'my-wrapper' });
            await render(TEMPLATE);
            assert.dom('.my-wrapper').hasClass('next-header-dd-menu-item', 'the default classes are kept by default');

            this.set('item', { text: 'Account', wrapperClass: 'my-wrapper', overwriteWrapperClass: true });
            assert.dom('.my-wrapper').doesNotHaveClass('next-header-dd-menu-item', 'the default classes are replaced');
        });
    });

    module('separators', function () {
        test('a separator renders a rule and nothing else', async function (assert) {
            this.set('item', { seperator: true });

            await render(TEMPLATE);

            assert.dom('.next-dd-menu-seperator').exists();
            assert.dom('.next-header-dd-menu-item').doesNotExist();
        });
    });

    module('anchor items', function () {
        test('an href renders a real link carrying its target', async function (assert) {
            this.set('item', { href: 'https://fleetbase.io', text: 'Docs', target: '_blank' });

            await render(TEMPLATE);

            assert.dom('a').hasAttribute('href', 'https://fleetbase.io');
            assert.dom('a').hasAttribute('target', '_blank');
            assert.dom('a').hasText('Docs');
        });

        test('clicking an anchor reports its action and params', async function (assert) {
            this.set('item', { href: '#', text: 'Docs', action: 'openDocs', params: { id: 7 } });

            await render(TEMPLATE);
            await click('a');

            assert.strictEqual(actions.length, 1);
            const [action, params, event] = actions[0];
            assert.strictEqual(action, 'openDocs');
            assert.deepEqual(params, { id: 7 });
            assert.strictEqual(event.type, 'click', 'the originating event is appended');
        });

        test('a disabled anchor is marked as such', async function (assert) {
            this.set('item', { href: '#', text: 'Docs', disabled: true });

            await render(TEMPLATE);

            assert.dom('a').hasClass('disabled');
            assert.dom('a').hasAttribute('disabled');
        });
    });

    module('interactive items', function () {
        test('an onClick item renders a clickable entry and invokes it', async function (assert) {
            let clicked = 0;
            this.set('item', { text: 'Sign out', onClick: () => clicked++ });

            await render(TEMPLATE);
            assert.dom('a').hasAttribute('href', 'javascript:;');
            assert.dom('a').hasText('Sign out');

            await click('a');
            assert.strictEqual(clicked, 1);
        });

        test('an interactive item wins over a route', async function (assert) {
            this.set('item', { text: 'Sign out', route: 'console.home', onClick: () => {} });

            await render(TEMPLATE);

            assert.dom('a').hasAttribute('href', 'javascript:;', 'it is not rendered as a LinkTo');
            assert.strictEqual(findAll('a').length, 1, 'only one entry is rendered');
        });

        test('an interactive item is only active when the menu selection matches', async function (assert) {
            this.set('item', { text: 'Orders', section: 'ops', slug: 'orders', onClick: () => {} });

            await render(TEMPLATE);

            assert.dom('a').doesNotHaveClass('active', 'nothing in the url selects this item');
        });
    });

    module('component items', function () {
        test('a component item renders that component', async function (assert) {
            this.owner.register('component:test-dd-entry', setComponentTemplate(hbs`<span class="rendered-entry">rendered by the item component</span>`, templateOnly()));
            this.set('item', { component: 'test-dd-entry', text: 'Rendered' });

            await render(TEMPLATE);

            assert.dom('.rendered-entry').hasText('rendered by the item component');
        });

        test('a component item with an onClick is treated as interactive instead', async function (assert) {
            this.set('item', { component: 'test-dd-entry', text: 'Rendered', onClick: () => {} });

            await render(TEMPLATE);

            assert.dom('a').hasText('Rendered', 'the interactive branch wins');
        });
    });

    module('route items', function () {
        test('a route item renders a link', async function (assert) {
            this.set('item', { route: 'index', text: 'Home' });

            await render(TEMPLATE);

            assert.dom('a').exists();
            assert.dom('a').hasClass('next-dd-item');
            assert.dom('a').hasText('Home');
        });
    });

    test('no item at all renders nothing', async function (assert) {
        this.set('item', undefined);

        await render(TEMPLATE);

        assert.dom('.next-header-dd-menu-item').doesNotExist('every shape check bails on a missing item');
        assert.dom('.next-dd-menu-seperator').doesNotExist();
    });

    // An ExtensionComponent instance is what ember-core hands over for a registered extension
    // menu item. It takes the component branch rather than the text branch — the component itself
    // resolves through a lazy engine, which a rendering test has no engine to load.
    test('an ExtensionComponent item with no onClick is classified as a component', async function (assert) {
        this.set('item', { component: new ExtensionComponent('@fleetbase/some-engine', 'components/menu-entry'), text: 'Not shown as text' });

        await render(TEMPLATE);

        assert.dom('.next-header-dd-menu-item').doesNotExist('it is not rendered as a text item');
        assert.dom(this.element).doesNotIncludeText('Not shown as text', 'the text is not what gets rendered');
    });

    test('an item with nothing to show renders nothing', async function (assert) {
        this.set('item', {});

        await render(TEMPLATE);

        assert.dom('.next-header-dd-menu-item').doesNotExist();
        assert.dom('.next-dd-menu-seperator').doesNotExist();
    });
});
