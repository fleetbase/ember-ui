import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs } from '../../../helpers/shell-stubs';
import { setupShellTheme, eachShellTheme, renderShell } from '@fleetbase/ember-ui/test-support';

function crumbTexts() {
    return findAll('.fb-crumb').map((crumb) => crumb.textContent.replace(/\s+/g, ' ').trim());
}

module('Integration | Component | layout/context-bar', function (hooks) {
    setupRenderingTest(hooks);
    setupShellTheme(hooks);

    module('without the context-bar service', function (hooks) {
        setupShellStubs(hooks);

        test('it renders the logo, the classic mount points and nothing else', async function (assert) {
            await render(hbs`<Layout::ContextBar class="extra"><span class="yielded">y</span></Layout::ContextBar>`);

            assert.dom('nav.fb-context-bar').hasAttribute('aria-label', 'Context').hasClass('extra');
            assert.dom('.fb-context-bar-logo').hasAttribute('data-test-route', 'console').hasAttribute('aria-label', 'Home');
            assert.dom('#view-header-left-content-a').exists();
            assert.dom('#view-header-left-content-b').exists();
            assert.dom('.yielded').exists('the block renders between the mount points');
            assert.dom('.fb-crumbs').doesNotExist();
            assert.dom('.fb-chips').doesNotExist();
        });

        test('@crumbs and @chips render without the service', async function (assert) {
            this.crumbs = [{ label: 'Fleet-Ops', route: 'console.fleet-ops' }, { label: 'Orders' }];
            this.chips = [{ label: '14 active', tone: 'ok' }];
            await render(hbs`<Layout::ContextBar @crumbs={{this.crumbs}} @chips={{this.chips}} />`);

            assert.deepEqual(crumbTexts(), ['Fleet-Ops', '› Orders']);
            assert.dom('.fb-chip.is-ok').hasText('14 active');
        });
    });

    module('with the context-bar service', function (hooks) {
        setupShellStubs(hooks, { contextBar: true });

        hooks.beforeEach(function () {
            this.contextBar = this.owner.lookup('service:context-bar');
        });

        test('plain crumbs: earlier ones navigate, the last is the current page', async function (assert) {
            this.contextBar.setCrumbs([
                { label: 'Fleet-Ops', route: 'console.fleet-ops', color: '#3b82f6' },
                { label: 'Drivers', route: 'console.fleet-ops.drivers', models: ['abc'], query: { status: 'active' } },
                { label: 'Kenji Tan', route: 'console.fleet-ops.drivers.view' },
            ]);
            await render(hbs`<Layout::ContextBar />`);

            assert.dom('ol.fb-crumbs').hasAttribute('aria-label', 'Breadcrumb');
            assert.deepEqual(crumbTexts(), ['Fleet-Ops', '› Drivers', '› Kenji Tan']);
            assert.dom('.fb-crumb-dot').exists({ count: 1 }, 'the first crumb carries the module colour dot');
            assert.strictEqual(find('.fb-crumb-dot').style.getPropertyValue('--fb-module-color'), '#3b82f6');
            assert.dom('.fb-crumb.is-current [aria-current="page"]').hasText('Kenji Tan');
            assert.dom('.fb-crumb-button').exists({ count: 2 }, 'the current crumb is not a button even with a route');

            await click(findAll('.fb-crumb-button')[1]);
            assert.deepEqual(this.router.transitions, [['console.fleet-ops.drivers', 'abc', { queryParams: { status: 'active' } }]]);
        });

        test('a crumb without a route is plain text', async function (assert) {
            this.contextBar.setCrumbs([{ label: 'Fleet-Ops' }, { label: 'Orders' }]);
            await render(hbs`<Layout::ContextBar />`);

            assert.dom('.fb-crumb-button').doesNotExist();
            assert.dom('.fb-crumb-dot').doesNotExist('no colour, no dot');
            assert.dom('.fb-crumb:first-child .fb-crumb-label').doesNotHaveAttribute('aria-current');
        });

        test('a split crumb is separated by ⧉', async function (assert) {
            this.contextBar.setCrumbs([{ label: 'Orders' }, { label: 'FLE988', split: true }]);
            await render(hbs`<Layout::ContextBar />`);

            assert.deepEqual(crumbTexts(), ['Orders', '⧉ FLE988']);
            assert.dom('.fb-crumb.is-split').exists({ count: 1 });
        });

        test('a menu crumb opens a menu of its items', async function (assert) {
            this.contextBar.setCrumbs([
                {
                    label: 'Fleet-Ops',
                    menu: [
                        { label: 'Storefront', route: 'console.storefront' },
                        { label: 'Ledger', route: 'console.ledger' },
                    ],
                },
                { label: 'Orders' },
            ]);
            await render(hbs`<Layout::ContextBar />`);

            assert.dom('.fb-crumb-menu .fb-crumb-button').hasAttribute('aria-haspopup', 'menu').containsText('Fleet-Ops');
            await click('.fb-crumb-menu .fb-crumb-button');
            await click(findAll('[role="menuitem"]')[1]);

            assert.deepEqual(this.router.transitions, [['console.ledger', { queryParams: {} }]]);
        });

        test('chips in each tone, and a menu chip', async function (assert) {
            this.contextBar.setChips([
                { label: '14 active', tone: 'ok' },
                { label: '2 stale GPS', tone: 'warn' },
                { label: 'Editing dock', tone: 'info' },
                { label: 'Unknown tone', tone: 'purple' },
                { label: 'Sort: newest', tone: 'menu', menu: [{ label: 'Oldest first', route: 'console.fleet-ops.orders', query: { sort: 'created_at' } }] },
                { label: 'Empty menu', tone: 'menu' },
            ]);
            await render(hbs`<Layout::ContextBar />`);

            assert.dom('.fb-chips').hasAttribute('aria-label', 'Status');
            assert.dom('span.fb-chip.is-ok').hasText('14 active');
            assert.dom('span.fb-chip.is-warn').hasText('2 stale GPS');
            assert.dom('span.fb-chip.is-info').exists({ count: 2 }, 'an unknown tone is shown as info');
            assert.dom('button.fb-chip.is-menu').exists({ count: 2 });

            await click('button.fb-chip.is-menu');
            await click('[role="menuitem"]');
            assert.deepEqual(this.router.transitions, [['console.fleet-ops.orders', { queryParams: { sort: 'created_at' } }]]);
        });

        test('it follows the service as routes update it, and clears', async function (assert) {
            this.contextBar.setCrumbs([{ label: 'Fleet-Ops' }]);
            await render(hbs`<Layout::ContextBar />`);
            assert.deepEqual(crumbTexts(), ['Fleet-Ops']);

            this.contextBar.setCrumbs([{ label: 'Ledger' }, { label: 'Invoices' }]);
            this.contextBar.setChips([{ label: '2 overdue', tone: 'warn' }]);
            await settled();
            assert.deepEqual(crumbTexts(), ['Ledger', '› Invoices']);
            assert.dom('.fb-chip').hasText('2 overdue');

            this.contextBar.clear();
            await settled();
            assert.dom('.fb-crumbs').doesNotExist();
            assert.dom('.fb-chips').doesNotExist();
        });

        test('@crumbs and @chips override the service', async function (assert) {
            this.contextBar.setCrumbs([{ label: 'From service' }]);
            this.contextBar.setChips([{ label: 'service chip' }]);
            this.crumbs = [{ label: 'From args' }];
            this.chips = [];
            await render(hbs`<Layout::ContextBar @crumbs={{this.crumbs}} @chips={{this.chips}} />`);

            assert.deepEqual(crumbTexts(), ['From args']);
            assert.dom('.fb-chips').doesNotExist();
        });

        eachShellTheme((theme) => {
            test(`it floats on the chrome surface in ${theme}`, async function (assert) {
                this.contextBar.setCrumbs([{ label: 'Orders' }]);
                const shell = await renderShell(hbs`<Layout::Canvas><:chrome><Layout::ContextBar /></:chrome></Layout::Canvas>`, { theme });
                const bar = shell.querySelector('.fb-context-bar');

                assert.strictEqual(getComputedStyle(bar).position, 'absolute');
                assert.strictEqual(getComputedStyle(bar).borderTopLeftRadius, '14px', 'the chrome radius token');
                assert.notStrictEqual(getComputedStyle(bar).backgroundColor, 'rgba(0, 0, 0, 0)', 'the chrome surface token');
            });
        });
    });
});
