import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/yield-sidebar', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // The component wormholes its block into the sidebar menu region, which the host
        // application owns; provide the destination inside the test container.
        const destination = document.createElement('div');
        destination.id = 'sidebar-menu-items';
        (document.getElementById('ember-testing') ?? document.body).appendChild(destination);
        this.destination = destination;
    });

    hooks.afterEach(function () {
        this.destination.remove();
    });

    test('it teleports its block into the sidebar menu region', async function (assert) {
        await render(hbs`<Layout::YieldSidebar><span class="teleported">Orders</span></Layout::YieldSidebar>`);

        assert.dom(this.destination.querySelector('.teleported')).hasText('Orders', 'the block lands in the sidebar');
    });

    test('it renders nothing where it is invoked', async function (assert) {
        await render(hbs`<div class="here"><Layout::YieldSidebar><span class="teleported">Orders</span></Layout::YieldSidebar></div>`);

        assert.dom('.here .teleported').doesNotExist('the content is not left behind at the call site');
    });

    test('an empty block teleports nothing', async function (assert) {
        await render(hbs`<Layout::YieldSidebar />`);

        assert.strictEqual(this.destination.querySelectorAll('*').length, 0);
    });
});
