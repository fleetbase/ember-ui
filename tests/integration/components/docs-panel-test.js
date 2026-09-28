import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render, triggerEvent, waitFor } from '@ember/test-helpers';
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
        docsPanel.open('https://www.fleetbase.io/docs/fleet-ops/orders', { title: 'Orders docs', theme: 'light' });

        await render(hbs`<DocsPanel />`);
        await waitFor('.fleetbase-docs-panel-overlay');

        assert.dom('.fleetbase-docs-panel-overlay').exists();
        assert.dom('.fleetbase-docs-panel-overlay iframe').hasAttribute('src', 'https://www.fleetbase.io/docs/fleet-ops/orders?embed=console&theme=light');
        assert.dom('.fleetbase-docs-panel-loading').exists();

        await triggerEvent('.fleetbase-docs-panel-overlay iframe', 'load');

        assert.dom('.fleetbase-docs-panel-loading').doesNotExist();
    });

    test('it renders fallback without a loading overlay for external urls', async function (assert) {
        const docsPanel = this.owner.lookup('service:docs-panel');
        docsPanel.open('https://example.com/help', { title: 'External docs' });

        await render(hbs`<DocsPanel />`);
        await waitFor('.fleetbase-docs-panel-overlay');

        assert.dom('.fleetbase-docs-panel-loading').doesNotExist();
        assert.dom('.fleetbase-docs-panel-overlay iframe').doesNotExist();
        assert.dom('.fleetbase-docs-panel-overlay').includesText('This page cannot be embedded here');
    });
    // The panel's own actions are thin delegations to the service, reached only through the
    // controls in its template.
    module('the panel controls', function () {
        function buttonWithIcon(icon) {
            return document.querySelector(`.fleetbase-docs-panel-overlay [data-icon="${icon}"]`)?.closest('button');
        }

        // FontAwesome renders `times` as `xmark`.
        test('the close button closes the panel', async function (assert) {
            const docsPanel = this.owner.lookup('service:docs-panel');
            docsPanel.open('https://www.fleetbase.io/docs/fleet-ops/orders', { title: 'Orders docs' });

            await render(hbs`<DocsPanel />`);
            await waitFor('.fleetbase-docs-panel-overlay');

            await click(buttonWithIcon('xmark'));

            assert.false(docsPanel.isOpen, 'the service is told to close');
            assert.dom('.fleetbase-docs-panel-overlay').doesNotExist('and the overlay goes with it');
        });

        test('the open-in-a-new-tab button hands the url to the browser', async function (assert) {
            // The service calls the real global `window.open`, so that is what has to be stood in for.
            const opened = [];
            const originalOpen = window.open;
            window.open = (url, target) => opened.push({ url, target });

            const docsPanel = this.owner.lookup('service:docs-panel');
            docsPanel.open('https://example.com/help', { title: 'External docs' });

            await render(hbs`<DocsPanel />`);
            await waitFor('.fleetbase-docs-panel-overlay');

            await click(buttonWithIcon('arrow-up-right-from-square'));

            window.open = originalOpen;

            assert.deepEqual(opened, [{ url: 'https://example.com/help', target: '_docs' }]);
        });

        test('an iframe that fails to load falls back to the open-in-a-new-tab panel', async function (assert) {
            const docsPanel = this.owner.lookup('service:docs-panel');
            docsPanel.open('https://www.fleetbase.io/docs/fleet-ops/orders', { title: 'Orders docs' });

            await render(hbs`<DocsPanel />`);
            await waitFor('.fleetbase-docs-panel-overlay iframe');

            // An `error` event dispatched at an element still reaches `window.onerror`, which QUnit
            // installs and would report as a global failure — on the very event this test raises.
            const originalOnerror = window.onerror;
            window.onerror = () => true;

            try {
                await triggerEvent('.fleetbase-docs-panel-overlay iframe', 'error');
            } finally {
                window.onerror = originalOnerror;
            }

            assert.true(docsPanel.iframeFailed, 'the failure is recorded');
            assert.dom('.fleetbase-docs-panel-overlay iframe').doesNotExist('the iframe is dropped');
            assert.dom('.fleetbase-docs-panel-overlay').includesText('This page cannot be embedded here');
        });
    });
});
