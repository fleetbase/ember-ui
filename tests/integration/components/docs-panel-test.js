import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | docs-panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.wormhole = document.createElement('div');
        this.wormhole.id = 'application-root-wormhole';
        document.body.appendChild(this.wormhole);
    });

    hooks.afterEach(function () {
        this.wormhole.remove();
    });

    test('it renders official docs in a right overlay', async function (assert) {
        const docsPanel = this.owner.lookup('service:docs-panel');
        docsPanel.open('https://www.fleetbase.io/docs/fleet-ops/orders', { title: 'Orders docs' });

        await render(hbs`<DocsPanel />`);
        await waitFor('.fleetbase-docs-panel-overlay');

        assert.dom('.fleetbase-docs-panel-overlay').exists();
        assert.dom('.fleetbase-docs-panel-overlay iframe').hasAttribute('src', 'https://www.fleetbase.io/docs/fleet-ops/orders');
    });
});
